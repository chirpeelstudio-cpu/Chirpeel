
-- 1. App role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'designer', 'sales', 'installer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  role_label text,
  active boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '{"overview":true,"leads":true,"quotation":true,"messages":true,"finance":false,"settings":false,"branding":false,"team":false}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Extend team_members with user_id
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 6. has_permission security definer (checks profiles.permissions json)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT (permissions ->> _permission)::boolean FROM public.profiles WHERE id = _user_id), false)
$$;

-- 7. is_admin_or_manager helper
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','manager')
  )
$$;

-- 8. get current profile email helper (for assigned_to matching by email or full_name)
CREATE OR REPLACE FUNCTION public.current_profile_identifier()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(full_name, email) FROM public.profiles WHERE id = auth.uid()
$$;

-- 9. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. updated_at trigger for profiles
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 11. RLS: user_roles (only admins manage; users can read their own)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 12. RLS: profiles (users read own + admins all; admins manage)
DROP POLICY IF EXISTS "View own or admin all" ON public.profiles;
CREATE POLICY "View own or admin all" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
DROP POLICY IF EXISTS "Update own or admin all" ON public.profiles;
CREATE POLICY "Update own or admin all" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins insert profiles" ON public.profiles;
CREATE POLICY "Admins insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());
DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;
CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 13. Tighten leads RLS to assigned-only for non admin/manager
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
CREATE POLICY "Read leads (admin/manager all, others assigned)" ON public.leads
  FOR SELECT TO authenticated USING (
    public.is_admin_or_manager(auth.uid())
    OR assigned_to = public.current_profile_identifier()
  );

DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
CREATE POLICY "Update leads (admin/manager all, others assigned)" ON public.leads
  FOR UPDATE TO authenticated USING (
    public.is_admin_or_manager(auth.uid())
    OR assigned_to = public.current_profile_identifier()
  ) WITH CHECK (
    public.is_admin_or_manager(auth.uid())
    OR assigned_to = public.current_profile_identifier()
  );

DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;
CREATE POLICY "Delete leads (admin/manager only)" ON public.leads
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- 14. Tighten lead_messages, lead_follow_ups, project_files (admin/manager all; others only for assigned leads)
DROP POLICY IF EXISTS "Authenticated can view lead messages" ON public.lead_messages;
CREATE POLICY "View lead messages (scoped)" ON public.lead_messages
  FOR SELECT TO authenticated USING (
    public.is_admin_or_manager(auth.uid())
    OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = public.current_profile_identifier())
  );
DROP POLICY IF EXISTS "Authenticated can insert lead messages" ON public.lead_messages;
CREATE POLICY "Insert lead messages (scoped)" ON public.lead_messages
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_or_manager(auth.uid())
    OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = public.current_profile_identifier())
  );
DROP POLICY IF EXISTS "Authenticated can delete lead messages" ON public.lead_messages;
CREATE POLICY "Delete lead messages (admin/manager)" ON public.lead_messages
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can manage follow_ups" ON public.lead_follow_ups;
CREATE POLICY "Manage follow_ups (scoped)" ON public.lead_follow_ups
  FOR ALL TO authenticated USING (
    public.is_admin_or_manager(auth.uid())
    OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = public.current_profile_identifier())
  ) WITH CHECK (
    public.is_admin_or_manager(auth.uid())
    OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = public.current_profile_identifier())
  );

-- 15. Quotations: admin/manager full; others only for their assigned leads
DROP POLICY IF EXISTS "Authenticated can manage quotations" ON public.quotations;
CREATE POLICY "View quotations (scoped)" ON public.quotations
  FOR SELECT TO authenticated USING (
    public.is_admin_or_manager(auth.uid())
    OR (lead_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = public.current_profile_identifier()))
    OR created_by = public.current_profile_identifier()
  );
CREATE POLICY "Insert quotations (any auth)" ON public.quotations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update quotations (scoped)" ON public.quotations
  FOR UPDATE TO authenticated USING (
    public.is_admin_or_manager(auth.uid())
    OR (lead_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = public.current_profile_identifier()))
  );
CREATE POLICY "Delete quotations (admin/manager)" ON public.quotations
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- 16. company_settings & material_pricing: read for all auth, write admin/manager only
DROP POLICY IF EXISTS "Authenticated can insert company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated can update company settings" ON public.company_settings;
CREATE POLICY "Admin/manager insert company settings" ON public.company_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Admin/manager update company settings" ON public.company_settings
  FOR UPDATE TO authenticated USING (public.is_admin_or_manager(auth.uid())) WITH CHECK (public.is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can manage material_pricing" ON public.material_pricing;
CREATE POLICY "Admin/manager manage material_pricing" ON public.material_pricing
  FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid())) WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- 17. team_members: admin only manage
DROP POLICY IF EXISTS "Authenticated can manage team_members" ON public.team_members;
CREATE POLICY "View team_members (auth)" ON public.team_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage team_members" ON public.team_members
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 18. Bootstrap: make existing admin@chirpeel.com an admin if account exists
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'admin@chirpeel.com' LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role_label, active, permissions)
    VALUES (_uid, 'admin@chirpeel.com', 'Admin', 'Admin', true,
      '{"overview":true,"leads":true,"quotation":true,"messages":true,"finance":true,"settings":true,"branding":true,"team":true}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      permissions = '{"overview":true,"leads":true,"quotation":true,"messages":true,"finance":true,"settings":true,"branding":true,"team":true}'::jsonb,
      role_label = 'Admin', active = true;
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin') ON CONFLICT DO NOTHING;
  END IF;
END $$;
