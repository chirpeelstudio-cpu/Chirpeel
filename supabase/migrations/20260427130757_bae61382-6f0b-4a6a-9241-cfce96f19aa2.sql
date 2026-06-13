-- razorpay_plans: lookup table from app plan/cycle/variant -> Razorpay plan_id
CREATE TABLE public.razorpay_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan text NOT NULL CHECK (plan IN ('pro','studio')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  variant text NOT NULL DEFAULT 'standard' CHECK (variant IN ('standard','promo50')),
  razorpay_plan_id text,
  amount_inr integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan, billing_cycle, variant)
);

ALTER TABLE public.razorpay_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read razorpay plans"
  ON public.razorpay_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER trg_razorpay_plans_updated_at
  BEFORE UPDATE ON public.razorpay_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the 6 known variants (razorpay_plan_id filled in by seed function later)
INSERT INTO public.razorpay_plans (plan, billing_cycle, variant, amount_inr) VALUES
  ('pro',    'monthly', 'standard', 2499),
  ('pro',    'monthly', 'promo50',  1249),
  ('pro',    'yearly',  'standard', 23990),
  ('studio', 'monthly', 'standard', 5999),
  ('studio', 'monthly', 'promo50',  2999),
  ('studio', 'yearly',  'standard', 57590);

-- subscriptions: one active row per tenant
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  plan text NOT NULL CHECK (plan IN ('free','pro','studio')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  razorpay_subscription_id text UNIQUE,
  razorpay_plan_id text,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','authenticated','active','pending','halted','cancelled','completed','expired')),
  current_start timestamptz,
  current_end timestamptz,
  promo_locked boolean NOT NULL DEFAULT false,
  short_url text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their tenant's subscriptions
CREATE POLICY "Tenant members can read subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- No client write/update/delete — service role bypasses RLS

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper RPC to get the current user's tenant subscription
CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS TABLE (
  id uuid, plan text, billing_cycle text, status text,
  current_start timestamptz, current_end timestamptz,
  promo_locked boolean, razorpay_subscription_id text, short_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.plan, s.billing_cycle, s.status, s.current_start, s.current_end,
         s.promo_locked, s.razorpay_subscription_id, s.short_url
  FROM public.subscriptions s
  WHERE s.tenant_id = public.current_tenant_id()
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;