CREATE TABLE public.recurring_invoice_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id uuid,
  lead_id uuid,
  milestone text,
  milestone_label text,
  amount numeric NOT NULL DEFAULT 0,
  gst_enabled boolean NOT NULL DEFAULT true,
  gst_rate numeric NOT NULL DEFAULT 18,
  frequency text NOT NULL DEFAULT 'monthly',
  next_run_date date NOT NULL DEFAULT CURRENT_DATE,
  last_generated_at timestamp with time zone,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager manage recurring templates"
  ON public.recurring_invoice_templates
  FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Finance view recurring templates"
  ON public.recurring_invoice_templates
  FOR SELECT TO authenticated
  USING (has_finance_access(auth.uid()));

CREATE TRIGGER set_updated_at_recurring_invoice_templates
  BEFORE UPDATE ON public.recurring_invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER log_activity_recurring_invoice_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.recurring_invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('recurring_invoice');

CREATE INDEX idx_recurring_templates_next_run ON public.recurring_invoice_templates (next_run_date) WHERE active = true;
CREATE INDEX idx_recurring_templates_quotation ON public.recurring_invoice_templates (quotation_id);