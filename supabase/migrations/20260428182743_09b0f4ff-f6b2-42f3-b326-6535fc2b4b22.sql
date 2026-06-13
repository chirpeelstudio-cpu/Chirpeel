-- ============================================================
-- Subscription invoices (charge history) + plan limits enforcement
-- ============================================================

-- 1. subscription_invoices: row per Razorpay subscription charge.
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  razorpay_subscription_id text,
  razorpay_invoice_id text UNIQUE,
  razorpay_payment_id text,
  amount_inr numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid',
  charged_at timestamptz NOT NULL DEFAULT now(),
  short_url text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_tenant ON public.subscription_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_sub ON public.subscription_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_charged_at ON public.subscription_invoices(charged_at DESC);

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read subscription invoices" ON public.subscription_invoices;
CREATE POLICY "Tenant members can read subscription invoices"
  ON public.subscription_invoices
  FOR SELECT
  TO authenticated
  USING (tenant_id = current_tenant_id());

-- (No client INSERT/UPDATE/DELETE — only service-role writes from webhook.)

-- 2. Helper: resolve effective plan for a tenant.
CREATE OR REPLACE FUNCTION public.tenant_effective_plan(_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan
       FROM public.subscriptions
      WHERE tenant_id = _tenant_id
        AND status IN ('active','authenticated','pending')
      ORDER BY created_at DESC
      LIMIT 1),
    'free'
  );
$$;

-- 3. Limits config (kept in SQL so the trigger and the client agree).
CREATE OR REPLACE FUNCTION public.plan_limit(_plan text, _kind text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _plan
    WHEN 'free'   THEN CASE _kind
      WHEN 'lead'         THEN 25
      WHEN 'quote'        THEN 5
      WHEN 'project'      THEN 2
      WHEN 'team_member'  THEN 1
      ELSE NULL END
    WHEN 'pro'    THEN CASE _kind
      WHEN 'lead'         THEN NULL          -- unlimited
      WHEN 'quote'        THEN NULL
      WHEN 'project'      THEN 25
      WHEN 'team_member'  THEN 5
      ELSE NULL END
    WHEN 'studio' THEN CASE _kind
      WHEN 'lead'         THEN NULL
      WHEN 'quote'        THEN NULL
      WHEN 'project'      THEN NULL
      WHEN 'team_member'  THEN 25
      ELSE NULL END
    ELSE NULL END;
$$;

-- 4. Server-side enforcement trigger (defence in depth; the UI gates first).
CREATE OR REPLACE FUNCTION public.enforce_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := NEW.tenant_id;
  v_plan text;
  v_limit integer;
  v_count integer;
  v_kind text := TG_ARGV[0];
  v_month_start timestamptz := date_trunc('month', now());
BEGIN
  -- Skip if no tenant resolvable (public lead submissions, etc.)
  IF v_tenant IS NULL THEN RETURN NEW; END IF;

  v_plan := tenant_effective_plan(v_tenant);
  v_limit := plan_limit(v_plan, v_kind);

  -- NULL limit means unlimited.
  IF v_limit IS NULL THEN RETURN NEW; END IF;

  IF v_kind = 'lead' THEN
    SELECT count(*) INTO v_count
      FROM public.leads
      WHERE tenant_id = v_tenant
        AND deleted_at IS NULL
        AND created_at >= v_month_start;
  ELSIF v_kind = 'quote' THEN
    SELECT count(*) INTO v_count
      FROM public.quotations
      WHERE tenant_id = v_tenant
        AND deleted_at IS NULL
        AND created_at >= v_month_start;
  ELSIF v_kind = 'project' THEN
    SELECT count(*) INTO v_count
      FROM public.projects
      WHERE tenant_id = v_tenant
        AND deleted_at IS NULL
        AND status NOT IN ('completed','cancelled','archived');
  ELSE
    RETURN NEW;
  END IF;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'PLAN_LIMIT_REACHED: % limit of % for plan % exceeded', v_kind, v_limit, v_plan
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_lead_limit ON public.leads;
CREATE TRIGGER trg_enforce_lead_limit
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_plan_limits('lead');

DROP TRIGGER IF EXISTS trg_enforce_quote_limit ON public.quotations;
CREATE TRIGGER trg_enforce_quote_limit
  BEFORE INSERT ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_plan_limits('quote');

DROP TRIGGER IF EXISTS trg_enforce_project_limit ON public.projects;
CREATE TRIGGER trg_enforce_project_limit
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_plan_limits('project');
