-- ============================================================
-- A. ACTIVITY LOG + audit triggers
-- ============================================================
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text,
  action text NOT NULL,             -- insert | update | delete
  entity_type text NOT NULL,        -- lead | quotation | invoice | payment | expense
  entity_id uuid,
  summary text,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_log_created_at ON public.activity_log (created_at DESC);
CREATE INDEX idx_activity_log_entity ON public.activity_log (entity_type, entity_id);
CREATE INDEX idx_activity_log_actor ON public.activity_log (actor);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/manager view activity log" ON public.activity_log
  FOR SELECT TO authenticated USING (is_admin_or_manager(auth.uid()));
-- No insert/update/delete policies = nobody can write directly; only SECURITY DEFINER triggers can.

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text;
  v_entity text := TG_ARGV[0];
  v_summary text;
  v_diff jsonb := '{}'::jsonb;
  v_id uuid;
  k text;
  old_val jsonb;
  new_val jsonb;
BEGIN
  v_actor := current_profile_identifier();

  IF TG_OP = 'DELETE' THEN
    v_id := (to_jsonb(OLD)->>'id')::uuid;
    v_summary := 'Deleted ' || v_entity;
    v_diff := jsonb_build_object('before', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    v_id := (to_jsonb(NEW)->>'id')::uuid;
    v_summary := 'Created ' || v_entity;
    v_diff := jsonb_build_object('after', to_jsonb(NEW));
  ELSE
    v_id := (to_jsonb(NEW)->>'id')::uuid;
    -- Compute changed columns only
    FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      old_val := to_jsonb(OLD)->k;
      new_val := to_jsonb(NEW)->k;
      IF old_val IS DISTINCT FROM new_val AND k NOT IN ('updated_at') THEN
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('from', old_val, 'to', new_val));
      END IF;
    END LOOP;
    IF v_diff = '{}'::jsonb THEN
      RETURN NEW;  -- nothing meaningful changed
    END IF;
    v_summary := 'Updated ' || v_entity;
    -- Friendlier summary for status/stage changes
    IF v_diff ? 'status' THEN
      v_summary := v_summary || ': status ' || COALESCE(v_diff->'status'->>'from','—') || ' → ' || COALESCE(v_diff->'status'->>'to','—');
    ELSIF v_diff ? 'stage' THEN
      v_summary := v_summary || ': stage ' || COALESCE(v_diff->'stage'->>'from','—') || ' → ' || COALESCE(v_diff->'stage'->>'to','—');
    ELSIF v_diff ? 'workflow_status' THEN
      v_summary := v_summary || ': workflow ' || COALESCE(v_diff->'workflow_status'->>'from','—') || ' → ' || COALESCE(v_diff->'workflow_status'->>'to','—');
    END IF;
  END IF;

  INSERT INTO public.activity_log (actor, action, entity_type, entity_id, summary, diff)
    VALUES (v_actor, lower(TG_OP), v_entity, v_id, v_summary, v_diff);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_leads
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('lead');
CREATE TRIGGER trg_audit_quotations
  AFTER INSERT OR UPDATE OR DELETE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('quotation');
CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('invoice');
CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('payment');
CREATE TRIGGER trg_audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('expense');

-- ============================================================
-- B. TASKS
-- ============================================================
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to text,
  created_by text,
  lead_id uuid,
  quotation_id uuid,
  priority text NOT NULL DEFAULT 'normal',  -- low | normal | high
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_assignee_open ON public.tasks (assigned_to) WHERE completed_at IS NULL;
CREATE INDEX idx_tasks_lead ON public.tasks (lead_id);
CREATE INDEX idx_tasks_due ON public.tasks (due_at);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own or admin/manager all (tasks)"
  ON public.tasks FOR ALL TO authenticated
  USING (
    is_admin_or_manager(auth.uid())
    OR assigned_to = current_profile_identifier()
    OR created_by  = current_profile_identifier()
  )
  WITH CHECK (
    is_admin_or_manager(auth.uid())
    OR assigned_to = current_profile_identifier()
    OR created_by  = current_profile_identifier()
  );

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- C. CLIENT SHARE LINKS (public portal)
-- ============================================================
CREATE TABLE public.client_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_share_links_lead ON public.client_share_links (lead_id);

ALTER TABLE public.client_share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/manager manage share links"
  ON public.client_share_links FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- ============================================================
-- D. PROJECT STAGE PHOTOS
-- ============================================================
CREATE TABLE public.project_stage_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  stage text NOT NULL,            -- factory | site | installation | handover
  photo_url text NOT NULL,
  caption text,
  uploaded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stage_photos_lead ON public.project_stage_photos (lead_id, stage);

ALTER TABLE public.project_stage_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View stage photos (scoped)"
  ON public.project_stage_photos FOR SELECT TO authenticated
  USING (
    is_admin_or_manager(auth.uid())
    OR EXISTS (SELECT 1 FROM public.leads l
      WHERE l.id = project_stage_photos.lead_id
        AND l.assigned_to = current_profile_identifier())
  );
CREATE POLICY "Manage stage photos (scoped)"
  ON public.project_stage_photos FOR ALL TO authenticated
  USING (
    is_admin_or_manager(auth.uid())
    OR EXISTS (SELECT 1 FROM public.leads l
      WHERE l.id = project_stage_photos.lead_id
        AND l.assigned_to = current_profile_identifier())
  )
  WITH CHECK (
    is_admin_or_manager(auth.uid())
    OR EXISTS (SELECT 1 FROM public.leads l
      WHERE l.id = project_stage_photos.lead_id
        AND l.assigned_to = current_profile_identifier())
  );

-- ============================================================
-- E. APP SETTINGS (singleton)
-- ============================================================
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_gst_rate numeric NOT NULL DEFAULT 18,
  default_validity_days integer NOT NULL DEFAULT 15,
  default_terms text,
  profit_margin_alert_pct numeric NOT NULL DEFAULT 25,
  monthly_lead_target integer NOT NULL DEFAULT 50,
  monthly_revenue_target numeric NOT NULL DEFAULT 1000000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can view app_settings"
  ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager update app_settings"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "Admin/manager insert app_settings"
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (default_gst_rate, default_validity_days, default_terms)
  VALUES (18, 15, '50% advance, 40% before installation, 10% after handover. 10-year warranty on factory work.');

-- ============================================================
-- F. DIGEST LOG
-- ============================================================
CREATE TABLE public.digest_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_to text,
  status text NOT NULL,    -- sent | failed
  error text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.digest_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/manager view digest_log"
  ON public.digest_log FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid()));

-- ============================================================
-- G. PROFILE EXTENSIONS
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tz text NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS working_hours jsonb NOT NULL DEFAULT '{"start":"09:00","end":"19:00","days":[1,2,3,4,5,6]}'::jsonb,
  ADD COLUMN IF NOT EXISTS digest_opt_in boolean NOT NULL DEFAULT true;

-- ============================================================
-- H. SOFT DELETE COLUMNS
-- ============================================================
ALTER TABLE public.leads      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.invoices   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.payments   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.expenses   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_not_deleted      ON public.leads      (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_not_deleted ON public.quotations (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_not_deleted   ON public.invoices   (created_at DESC) WHERE deleted_at IS NULL;

-- Helper: soft-delete + restore RPCs (admin/manager only)
CREATE OR REPLACE FUNCTION public.soft_delete_entity(_entity text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;
  IF _entity = 'lead' THEN
    UPDATE public.leads SET deleted_at = now() WHERE id = _id;
  ELSIF _entity = 'quotation' THEN
    UPDATE public.quotations SET deleted_at = now() WHERE id = _id;
  ELSIF _entity = 'invoice' THEN
    UPDATE public.invoices SET deleted_at = now() WHERE id = _id;
  ELSIF _entity = 'payment' THEN
    UPDATE public.payments SET deleted_at = now() WHERE id = _id;
  ELSIF _entity = 'expense' THEN
    UPDATE public.expenses SET deleted_at = now() WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'Unknown entity %', _entity;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.restore_entity(_entity text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;
  IF _entity = 'lead' THEN
    UPDATE public.leads SET deleted_at = NULL WHERE id = _id;
  ELSIF _entity = 'quotation' THEN
    UPDATE public.quotations SET deleted_at = NULL WHERE id = _id;
  ELSIF _entity = 'invoice' THEN
    UPDATE public.invoices SET deleted_at = NULL WHERE id = _id;
  ELSIF _entity = 'payment' THEN
    UPDATE public.payments SET deleted_at = NULL WHERE id = _id;
  ELSIF _entity = 'expense' THEN
    UPDATE public.expenses SET deleted_at = NULL WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'Unknown entity %', _entity;
  END IF;
END; $$;

-- ============================================================
-- I. CLIENT PORTAL public RPC (no auth required, security definer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_client_portal_data(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_link_id uuid;
  v_data jsonb;
BEGIN
  SELECT id, lead_id INTO v_link_id, v_lead_id
    FROM public.client_share_links
    WHERE token = _token
      AND revoked = false
      AND (expires_at IS NULL OR expires_at > now());
  IF v_lead_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.client_share_links
    SET view_count = view_count + 1, last_viewed_at = now()
    WHERE id = v_link_id;

  SELECT jsonb_build_object(
    'lead', (
      SELECT jsonb_build_object(
        'name', l.name,
        'project_type', l.project_type,
        'city', l.city,
        'stage', l.stage,
        'created_at', l.created_at
      ) FROM public.leads l WHERE l.id = v_lead_id AND l.deleted_at IS NULL
    ),
    'quotation', (
      SELECT jsonb_build_object(
        'quotation_number', q.quotation_number,
        'project_name', q.project_name,
        'subtotal', q.subtotal,
        'discount_amount', q.discount_amount,
        'gst_amount', q.gst_amount,
        'total_amount', q.total_amount,
        'sent_at', q.sent_at,
        'pdf_url', q.pdf_url
      ) FROM public.quotations q
        WHERE q.lead_id = v_lead_id AND q.deleted_at IS NULL
        ORDER BY q.created_at DESC LIMIT 1
    ),
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'paid_on', p.paid_on, 'amount', p.amount, 'milestone', p.milestone, 'mode', p.mode
      ) ORDER BY p.paid_on DESC)
      FROM public.payments p
      WHERE p.lead_id = v_lead_id AND p.deleted_at IS NULL
    ), '[]'::jsonb),
    'invoices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'invoice_number', i.invoice_number, 'issue_date', i.issue_date,
        'due_date', i.due_date, 'total_amount', i.total_amount,
        'paid_amount', i.paid_amount, 'status', i.status, 'pdf_url', i.pdf_url
      ) ORDER BY i.issue_date DESC)
      FROM public.invoices i
      WHERE i.lead_id = v_lead_id AND i.deleted_at IS NULL
    ), '[]'::jsonb),
    'photos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'stage', sp.stage, 'photo_url', sp.photo_url,
        'caption', sp.caption, 'created_at', sp.created_at
      ) ORDER BY sp.created_at DESC)
      FROM public.project_stage_photos sp
      WHERE sp.lead_id = v_lead_id
    ), '[]'::jsonb),
    'files', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'file_name', f.file_name, 'file_url', f.file_url,
        'file_type', f.file_type, 'created_at', f.created_at
      ) ORDER BY f.created_at DESC)
      FROM public.project_files f
      WHERE f.lead_id = v_lead_id
    ), '[]'::jsonb),
    'company', (
      SELECT jsonb_build_object(
        'name', c.company_name, 'tagline', c.tagline,
        'phone', c.phone, 'email', c.email, 'website', c.website,
        'logo_url', c.logo_url, 'accent_color', c.accent_color
      ) FROM public.company_settings c LIMIT 1
    )
  ) INTO v_data;

  RETURN v_data;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_client_portal_data(text) TO anon, authenticated;