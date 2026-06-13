-- Add attribution columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS ad_id text,
  ADD COLUMN IF NOT EXISTS form_id text;

-- 1. marketing_channels
CREATE TABLE IF NOT EXISTS public.marketing_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  channel_type text NOT NULL,            -- meta | google_ads | whatsapp_cloud | whatsapp_thirdparty
  display_name text,
  status text NOT NULL DEFAULT 'not_connected', -- not_connected | connected | error
  config jsonb NOT NULL DEFAULT '{}'::jsonb,    -- non-secret fields (page_id, phone_number_id, verify_token, webhook_url, third_party_webhook_url, etc.)
  secret_ref text,                              -- name of the secret holding the access token
  last_event_at timestamptz,
  last_error text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, channel_type)
);

ALTER TABLE public.marketing_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_marketing_channels_view ON public.marketing_channels
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_marketing_channels_manage ON public.marketing_channels
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_marketing_channels_updated_at
  BEFORE UPDATE ON public.marketing_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. marketing_campaigns
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  name text NOT NULL,
  channel_type text NOT NULL DEFAULT 'whatsapp_cloud',
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience_csv_url text,
  template_name text,
  template_language text DEFAULT 'en',
  template_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_body text,                       -- used for 3rd-party / generic webhook campaigns
  status text NOT NULL DEFAULT 'draft',    -- draft | scheduled | sending | completed | failed | cancelled
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  audience_count integer NOT NULL DEFAULT 0,
  stats jsonb NOT NULL DEFAULT '{"sent":0,"delivered":0,"read":0,"replied":0,"failed":0}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_marketing_campaigns_view ON public.marketing_campaigns
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_marketing_campaigns_manage ON public.marketing_campaigns
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant_status
  ON public.marketing_campaigns(tenant_id, status, created_at DESC);

-- 3. marketing_campaign_recipients
CREATE TABLE IF NOT EXISTS public.marketing_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  lead_id uuid,
  phone text NOT NULL,
  name text,
  merged_vars jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued',  -- queued | sent | delivered | read | failed
  error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_marketing_recipients_view ON public.marketing_campaign_recipients
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_marketing_recipients_manage ON public.marketing_campaign_recipients
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_marketing_recipients_campaign
  ON public.marketing_campaign_recipients(campaign_id, status);

-- 4. marketing_inbound_leads (raw webhook log)
CREATE TABLE IF NOT EXISTS public.marketing_inbound_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  channel_type text NOT NULL,
  campaign_name text,
  ad_name text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  lead_id uuid,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_inbound_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_marketing_inbound_view ON public.marketing_inbound_leads
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_marketing_inbound_tenant_created
  ON public.marketing_inbound_leads(tenant_id, created_at DESC);
