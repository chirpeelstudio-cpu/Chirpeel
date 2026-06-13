
-- =========================================================================
-- 1. CORE TENANT TABLES
-- =========================================================================
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_members (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);
CREATE UNIQUE INDEX tenant_members_user_unique ON public.tenant_members(user_id);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.default_public_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1
$$;

CREATE POLICY "Members can view their tenant" ON public.tenants FOR SELECT TO authenticated
  USING (id = current_tenant_id());
CREATE POLICY "Members can view own membership" ON public.tenant_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =========================================================================
-- 2. SEED MOHAN INTERIOR TENANT
-- =========================================================================
DO $$
DECLARE
  v_tenant_id uuid;
  v_admin_id uuid := '359a85cc-d3e0-4b18-8238-d365be95eb20';
BEGIN
  INSERT INTO public.tenants (name, created_by) VALUES ('Mohan Interior', v_admin_id)
    RETURNING id INTO v_tenant_id;
  INSERT INTO public.tenant_members (tenant_id, user_id)
    SELECT v_tenant_id, id FROM public.profiles
    ON CONFLICT DO NOTHING;
END $$;

-- =========================================================================
-- 3. ADD tenant_id TO ALL BUSINESS TABLES + BACKFILL
-- =========================================================================
DO $$
DECLARE
  v_default uuid;
  t text;
  business_tables text[] := ARRAY[
    'leads','quotations','quotation_rooms','quotation_room_items','quotation_versions',
    'quotation_workflow_log','quotation_send_history','invoices','payments','expenses',
    'projects','project_milestones','project_materials','project_boq_items','project_files',
    'project_stage_photos','lead_follow_ups','lead_messages','client_share_links',
    'company_settings','app_settings','team_members','message_templates','pipeline_stages',
    'lead_sources','lead_tags','lead_routing_rules','brand_catalog','pricing_catalog',
    'pricing_rooms','pricing_item_categories','material_pricing','material_room_pricing',
    'expense_categories','gst_presets','payment_milestone_templates',
    'payment_milestone_template_items','boq_products','boq_product_vendors','vendors',
    'purchase_orders','po_status_history','activity_log','finance_reminder_log',
    'digest_log','tasks','recurring_invoice_templates','room_category_map',
    'vendor_po_dispatch_log','invoice_fy_seq'
  ];
BEGIN
  SELECT id INTO v_default FROM public.tenants ORDER BY created_at ASC LIMIT 1;

  FOREACH t IN ARRAY business_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid', t);
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, v_default);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', t || '_tenant_idx', t);
  END LOOP;
END $$;

-- Per-tenant invoice sequence
ALTER TABLE public.invoice_fy_seq DROP CONSTRAINT IF EXISTS invoice_fy_seq_pkey;
ALTER TABLE public.invoice_fy_seq ADD PRIMARY KEY (tenant_id, fy_start);

-- =========================================================================
-- 4. AUTOFILL TRIGGER: set tenant_id on insert if not provided
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_tenant_id_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  v_tenant := current_tenant_id();
  IF v_tenant IS NULL THEN
    v_tenant := default_public_tenant_id();
  END IF;
  NEW.tenant_id := v_tenant;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'leads','quotations','quotation_rooms','quotation_room_items','quotation_versions',
    'quotation_workflow_log','quotation_send_history','invoices','payments','expenses',
    'projects','project_milestones','project_materials','project_boq_items','project_files',
    'project_stage_photos','lead_follow_ups','lead_messages','client_share_links',
    'company_settings','app_settings','team_members','message_templates','pipeline_stages',
    'lead_sources','lead_tags','lead_routing_rules','brand_catalog','pricing_catalog',
    'pricing_rooms','pricing_item_categories','material_pricing','material_room_pricing',
    'expense_categories','gst_presets','payment_milestone_templates',
    'payment_milestone_template_items','boq_products','boq_product_vendors','vendors',
    'purchase_orders','po_status_history','activity_log','finance_reminder_log',
    'digest_log','tasks','recurring_invoice_templates','room_category_map',
    'vendor_po_dispatch_log','invoice_fy_seq'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default()', t);
  END LOOP;
END $$;

-- =========================================================================
-- 5. DROP OLD POLICIES & CREATE TENANT-SCOPED ONES
-- =========================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public'
      AND tablename = ANY(ARRAY[
        'leads','quotations','quotation_rooms','quotation_room_items','quotation_versions',
        'quotation_workflow_log','quotation_send_history','invoices','payments','expenses',
        'projects','project_milestones','project_materials','project_boq_items','project_files',
        'project_stage_photos','lead_follow_ups','lead_messages','client_share_links',
        'company_settings','app_settings','team_members','message_templates','pipeline_stages',
        'lead_sources','lead_tags','lead_routing_rules','brand_catalog','pricing_catalog',
        'pricing_rooms','pricing_item_categories','material_pricing','material_room_pricing',
        'expense_categories','gst_presets','payment_milestone_templates',
        'payment_milestone_template_items','boq_products','boq_product_vendors','vendors',
        'purchase_orders','po_status_history','activity_log','finance_reminder_log',
        'digest_log','tasks','recurring_invoice_templates','room_category_map',
        'vendor_po_dispatch_log','invoice_fy_seq'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- LEADS
CREATE POLICY "Public can submit leads" ON public.leads FOR INSERT TO anon, authenticated
  WITH CHECK (tenant_id = default_public_tenant_id() OR tenant_id = current_tenant_id());
CREATE POLICY "Tenant read leads" ON public.leads FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id()
    AND (is_admin_or_manager(auth.uid()) OR assigned_to = current_profile_identifier() OR assigned_to IS NULL));
CREATE POLICY "Tenant update leads" ON public.leads FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id()
    AND (is_admin_or_manager(auth.uid()) OR assigned_to = current_profile_identifier()))
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY "Tenant delete leads" ON public.leads FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));

-- View+admin pattern
DO $$
DECLARE
  t text;
  view_only_tables text[] := ARRAY[
    'app_settings','company_settings','message_templates','pipeline_stages',
    'lead_sources','lead_tags','lead_routing_rules','brand_catalog','pricing_catalog',
    'pricing_rooms','pricing_item_categories','material_pricing','material_room_pricing',
    'expense_categories','gst_presets','payment_milestone_templates',
    'payment_milestone_template_items','boq_products','boq_product_vendors',
    'room_category_map'
  ];
BEGIN
  FOREACH t IN ARRAY view_only_tables LOOP
    EXECUTE format($f$CREATE POLICY tenant_view ON public.%I FOR SELECT TO authenticated USING (tenant_id = current_tenant_id())$f$, t);
    EXECUTE format($f$CREATE POLICY tenant_admin_manage ON public.%I FOR ALL TO authenticated USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid())) WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))$f$, t);
  END LOOP;
END $$;

-- Quotations
CREATE POLICY tenant_quotations_all ON public.quotations FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_qrooms_all ON public.quotation_rooms FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_qitems_all ON public.quotation_room_items FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_qversions_all ON public.quotation_versions FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_qwflog_all ON public.quotation_workflow_log FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_qsend_all ON public.quotation_send_history FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

-- Finance
CREATE POLICY tenant_invoices_view ON public.invoices FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND has_finance_access(auth.uid()));
CREATE POLICY tenant_invoices_manage ON public.invoices FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));
CREATE POLICY tenant_payments_view ON public.payments FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND has_finance_access(auth.uid()));
CREATE POLICY tenant_payments_manage ON public.payments FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));
CREATE POLICY tenant_expenses_view ON public.expenses FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND has_finance_access(auth.uid()));
CREATE POLICY tenant_expenses_manage ON public.expenses FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));
CREATE POLICY tenant_invseq_view ON public.invoice_fy_seq FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND has_finance_access(auth.uid()));
CREATE POLICY tenant_recur_manage ON public.recurring_invoice_templates FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));
CREATE POLICY tenant_finrem_manage ON public.finance_reminder_log FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));
CREATE POLICY tenant_finrem_view ON public.finance_reminder_log FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND has_finance_access(auth.uid()));

-- Projects
CREATE POLICY tenant_projects_all ON public.projects FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_pmilestones_all ON public.project_milestones FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_pmaterials_all ON public.project_materials FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_pboq_all ON public.project_boq_items FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_pfiles_all ON public.project_files FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_pphotos_all ON public.project_stage_photos FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

-- Lead-related
CREATE POLICY tenant_followups_all ON public.lead_follow_ups FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_messages_all ON public.lead_messages FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_share_links_all ON public.client_share_links FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));

-- Vendors / POs
CREATE POLICY tenant_vendors_all ON public.vendors FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_pos_all ON public.purchase_orders FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_po_history_all ON public.po_status_history FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tenant_po_dispatch_all ON public.vendor_po_dispatch_log FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));

-- Tasks
CREATE POLICY tenant_tasks_all ON public.tasks FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

-- Team
CREATE POLICY tenant_team_view ON public.team_members FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_team_manage ON public.team_members FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));

-- Logs
CREATE POLICY tenant_activity_view ON public.activity_log FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));
CREATE POLICY tenant_digest_view ON public.digest_log FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));

-- =========================================================================
-- 6. UPDATED RPCs
-- =========================================================================
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_fy int;
  v_seq int;
  v_tenant uuid := current_tenant_id();
BEGIN
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'No tenant for current user'; END IF;
  IF EXTRACT(MONTH FROM v_today) >= 4 THEN
    v_fy := EXTRACT(YEAR FROM v_today)::int;
  ELSE
    v_fy := EXTRACT(YEAR FROM v_today)::int - 1;
  END IF;
  INSERT INTO public.invoice_fy_seq(tenant_id, fy_start, last_seq)
    VALUES (v_tenant, v_fy, 1)
    ON CONFLICT (tenant_id, fy_start)
    DO UPDATE SET last_seq = invoice_fy_seq.last_seq + 1, updated_at = now()
    RETURNING last_seq INTO v_seq;
  RETURN 'HC-INV-' || v_fy::text || '-' || LPAD(v_seq::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_onboarding(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_settings_id uuid;
  v_company_name text := COALESCE(NULLIF(payload->>'company_name',''), 'My Studio');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.tenant_members WHERE user_id = v_uid LIMIT 1;
  IF v_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, created_by) VALUES (v_company_name, v_uid)
      RETURNING id INTO v_tenant_id;
    INSERT INTO public.tenant_members (tenant_id, user_id) VALUES (v_tenant_id, v_uid)
      ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.tenants SET name = v_company_name WHERE id = v_tenant_id AND created_by = v_uid;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin')
    ON CONFLICT DO NOTHING;

  SELECT id INTO v_settings_id FROM public.company_settings WHERE tenant_id = v_tenant_id LIMIT 1;
  IF v_settings_id IS NULL THEN
    INSERT INTO public.company_settings (
      tenant_id, company_name, logo_url, phone, email, address, gstin,
      primary_color, accent_color, currency, currency_symbol,
      timezone, fy_start_month, onboarding_completed_at
    ) VALUES (
      v_tenant_id, v_company_name,
      NULLIF(payload->>'logo_url',''),
      NULLIF(payload->>'phone',''),
      NULLIF(payload->>'email',''),
      NULLIF(payload->>'address',''),
      NULLIF(payload->>'gstin',''),
      NULLIF(payload->>'primary_color',''),
      COALESCE(NULLIF(payload->>'accent_color',''), '#0F2C5F'),
      COALESCE(NULLIF(payload->>'currency',''), 'INR'),
      COALESCE(NULLIF(payload->>'currency_symbol',''), '₹'),
      COALESCE(NULLIF(payload->>'timezone',''), 'Asia/Kolkata'),
      COALESCE((payload->>'fy_start_month')::int, 4),
      now()
    ) RETURNING id INTO v_settings_id;
  ELSE
    UPDATE public.company_settings SET
      company_name = v_company_name,
      logo_url = COALESCE(NULLIF(payload->>'logo_url',''), logo_url),
      phone = COALESCE(NULLIF(payload->>'phone',''), phone),
      email = COALESCE(NULLIF(payload->>'email',''), email),
      address = COALESCE(NULLIF(payload->>'address',''), address),
      gstin = COALESCE(NULLIF(payload->>'gstin',''), gstin),
      primary_color = COALESCE(NULLIF(payload->>'primary_color',''), primary_color),
      accent_color = COALESCE(NULLIF(payload->>'accent_color',''), accent_color),
      currency = COALESCE(NULLIF(payload->>'currency',''), currency),
      currency_symbol = COALESCE(NULLIF(payload->>'currency_symbol',''), currency_symbol),
      timezone = COALESCE(NULLIF(payload->>'timezone',''), timezone),
      fy_start_month = COALESCE((payload->>'fy_start_month')::int, fy_start_month),
      onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
      updated_at = now()
    WHERE id = v_settings_id;
  END IF;

  RETURN jsonb_build_object('id', v_settings_id, 'tenant_id', v_tenant_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
