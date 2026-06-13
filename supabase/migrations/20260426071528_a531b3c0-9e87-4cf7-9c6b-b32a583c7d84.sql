-- Phase 1: Operations & Data
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'gray',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view lead_sources" ON public.lead_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage lead_sources" ON public.lead_sources FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE TRIGGER set_updated_at_lead_sources BEFORE UPDATE ON public.lead_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view lead_tags" ON public.lead_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage lead_tags" ON public.lead_tags FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE TRIGGER set_updated_at_lead_tags BEFORE UPDATE ON public.lead_tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'bg-blue-500',
  sub_statuses jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view pipeline_stages" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage pipeline_stages" ON public.pipeline_stages FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE TRIGGER set_updated_at_pipeline_stages BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.lead_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  match_source text,
  match_city text,
  assign_to text,
  round_robin_pool jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view lead_routing_rules" ON public.lead_routing_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage lead_routing_rules" ON public.lead_routing_rules FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE TRIGGER set_updated_at_lead_routing_rules BEFORE UPDATE ON public.lead_routing_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS dedup_warn_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dedup_auto_merge boolean NOT NULL DEFAULT false;

-- Seed pipeline stages from current STAGES constant
INSERT INTO public.pipeline_stages (key, label, color, sub_statuses, sort_order) VALUES
  ('leads',       'Leads',       'bg-blue-500',   '["New Lead","Called","Not Picked","Interested","Not Interested","Follow-up Later"]'::jsonb, 1),
  ('follow_up',   'Follow-up',   'bg-yellow-500', '["Pending","In Progress","Done"]'::jsonb, 2),
  ('site_visit',  'Site Visit',  'bg-orange-500', '["Scheduled","Visited","Measurement Taken"]'::jsonb, 3),
  ('booking',     'Booking',     'bg-pink-500',   '["Quotation Shared","Negotiation","Booked (10% Advance)"]'::jsonb, 4),
  ('designing',   'Designing',   'bg-purple-500', '["In Designing","Design Shared","Design Approved"]'::jsonb, 5),
  ('execution',   'Execution',   'bg-indigo-500', '["Site Cross Verified","Production Started","50% Advance Received","Installation Started","Installation Done"]'::jsonb, 6),
  ('handover',    'Handover',    'bg-teal-500',   '["Deep Cleaning","Handover Done","100% Payment Received"]'::jsonb, 7),
  ('completed',   'Completed',   'bg-green-500',  '["Review Link Sent","Review Received"]'::jsonb, 8)
ON CONFLICT (key) DO NOTHING;

-- Seed lead sources from current SOURCE_COLORS keys
INSERT INTO public.lead_sources (key, label, color, sort_order) VALUES
  ('popup',           'Website Popup',     'amber', 1),
  ('quote_modal',     'Quote Modal',       'blue', 2),
  ('contact_form',    'Contact Form',      'green', 3),
  ('price_calculator','Price Calculator',  'purple', 4),
  ('google_meta_ads', 'Google/Meta Ads',   'red', 5),
  ('career',          'Career Form',       'cyan', 6),
  ('walk_in',         'Walk-In',           'emerald', 7),
  ('google_ads',      'Google Ads',        'red', 8),
  ('meta_ads',        'Meta Ads',          'indigo', 9),
  ('referral',        'Referral',          'pink', 10),
  ('bni_referral',    'BNI Referral',      'orange', 11)
ON CONFLICT (key) DO NOTHING;