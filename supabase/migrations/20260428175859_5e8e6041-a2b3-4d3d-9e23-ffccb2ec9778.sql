-- =====================================================================
-- BATCH 1 (part 2): Helper functions + policy updates using new roles
-- =====================================================================

-- Helper: is this user an "owner-equivalent" (owner/admin/manager)?
CREATE OR REPLACE FUNCTION public.is_owner_equivalent(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner','admin','manager')
  )
$$;

-- Update is_admin_or_manager to also include the new 'owner' role.
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner','admin','manager')
  )
$$;

-- Replace has_finance_access to also accept Owner + Accounts roles.
CREATE OR REPLACE FUNCTION public.has_finance_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_owner_equivalent(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role = 'accounts')
      OR public.has_permission(_user_id, 'finance')
$$;

-- Helper: lead access (Owner-equiv, Sales, Accounts, Designer can read all).
CREATE OR REPLACE FUNCTION public.has_lead_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_owner_equivalent(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role IN ('sales','accounts','designer'))
      OR public.has_permission(_user_id, 'leads')
$$;

-- Helper: project / vendor / BOQ access.
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_owner_equivalent(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role IN ('designer','sales','accounts'))
      OR public.has_permission(_user_id, 'projects')
$$;

-- Helper: who can manage team (invite users / change roles).
CREATE OR REPLACE FUNCTION public.can_manage_team(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_owner_equivalent(_user_id)
$$;

-- Helper: who can edit a sales record (any non-finance staff role).
CREATE OR REPLACE FUNCTION public.can_edit_sales(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_owner_equivalent(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role = 'sales')
$$;

-- =====================================================================
-- Widen LEADS read policy: Sales/Accounts/Designer can also read.
-- (Existing policy required admin/manager OR assignee.)
-- =====================================================================
DROP POLICY IF EXISTS "Tenant read leads" ON public.leads;
CREATE POLICY "Tenant read leads" ON public.leads
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND (
      public.has_lead_access(auth.uid())
      OR assigned_to = current_profile_identifier()
      OR assigned_to IS NULL
    )
  );

-- Update lead UPDATE policy: sales role can update leads in their tenant.
DROP POLICY IF EXISTS "Tenant update leads" ON public.leads;
CREATE POLICY "Tenant update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND (
      public.is_owner_equivalent(auth.uid())
      OR assigned_to = current_profile_identifier()
      OR public.can_edit_sales(auth.uid())
    )
  )
  WITH CHECK (tenant_id = current_tenant_id());
