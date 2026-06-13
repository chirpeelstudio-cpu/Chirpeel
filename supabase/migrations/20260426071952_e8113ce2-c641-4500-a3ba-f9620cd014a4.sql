-- Phase 2: Quotation & Finance settings

-- 1) Add discount caps + invoice numbering format to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS discount_cap_executive_pct numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS discount_cap_manager_pct numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS discount_cap_admin_pct numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS invoice_number_format text NOT NULL DEFAULT 'INV/{FY}/{SEQ:0000}',
  ADD COLUMN IF NOT EXISTS quotation_number_format text NOT NULL DEFAULT 'QT/{FY}/{SEQ:0000}';

-- 2) GST presets
CREATE TABLE IF NOT EXISTS public.gst_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  rate numeric NOT NULL,
  hsn_sac_code text,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gst_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can view gst_presets" ON public.gst_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager manage gst_presets" ON public.gst_presets FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE TRIGGER trg_gst_presets_updated_at BEFORE UPDATE ON public.gst_presets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO public.gst_presets (label, rate, hsn_sac_code, is_default, sort_order) VALUES
  ('GST 18% (Standard)', 18, '9954', true, 1),
  ('GST 12%', 12, '9954', false, 2),
  ('GST 5%', 5, '9954', false, 3),
  ('GST 0% (Exempt)', 0, NULL, false, 4)
ON CONFLICT DO NOTHING;

-- 3) Payment milestone templates
CREATE TABLE IF NOT EXISTS public.payment_milestone_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.payment_milestone_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.payment_milestone_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  percentage numeric NOT NULL,
  due_offset_days integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_milestone_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_milestone_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed view templates" ON public.payment_milestone_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager manage templates" ON public.payment_milestone_templates FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "Anyone authed view template items" ON public.payment_milestone_template_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager manage template items" ON public.payment_milestone_template_items FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE TRIGGER trg_milestone_templates_updated_at BEFORE UPDATE ON public.payment_milestone_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed a default 40/40/20 template
DO $$
DECLARE tpl_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.payment_milestone_templates) THEN
    INSERT INTO public.payment_milestone_templates (name, description, is_default) VALUES
      ('Standard 40/40/20', '40% advance, 40% on production, 20% on delivery', true)
      RETURNING id INTO tpl_id;
    INSERT INTO public.payment_milestone_template_items (template_id, label, percentage, due_offset_days, sort_order) VALUES
      (tpl_id, 'Advance', 40, 0, 1),
      (tpl_id, 'On Production', 40, 15, 2),
      (tpl_id, 'On Delivery', 20, 45, 3);
  END IF;
END $$;

-- 4) Expense categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#64748b',
  budget_monthly numeric,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed view expense_categories" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager manage expense_categories" ON public.expense_categories FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE TRIGGER trg_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO public.expense_categories (name, color, sort_order) VALUES
  ('Materials', '#3b82f6', 1),
  ('Labor', '#f59e0b', 2),
  ('Transport', '#10b981', 3),
  ('Marketing', '#ec4899', 4),
  ('Office', '#8b5cf6', 5),
  ('Miscellaneous', '#64748b', 6)
ON CONFLICT (name) DO NOTHING;