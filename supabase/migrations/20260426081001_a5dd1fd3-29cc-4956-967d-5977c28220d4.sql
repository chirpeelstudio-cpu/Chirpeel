
-- C3: Extend company_settings for tenant branding & locale
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS currency_symbol text DEFAULT '₹',
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS fy_start_month int DEFAULT 4,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- C3: Branding storage bucket (logos, favicons)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of branding assets (logo shown in client portal, PDFs)
DO $$ BEGIN
  CREATE POLICY "Branding assets are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'branding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated users can upload/update/delete branding assets
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload branding"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'branding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update branding"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'branding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete branding"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'branding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- B1: First-user-becomes-admin trigger
-- Replace the existing handle_new_user to also assign admin role to the first user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_count int;
BEGIN
  -- Always create the profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  -- Count existing profiles (excluding this new one) — first user gets admin
  SELECT COUNT(*) INTO v_user_count FROM public.profiles WHERE id <> NEW.id;
  IF v_user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
