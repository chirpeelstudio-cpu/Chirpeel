-- ============ FINANCE MODULE ============

-- Helper: check finance permission
CREATE OR REPLACE FUNCTION public.has_finance_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin_or_manager(_user_id)
      OR has_permission(_user_id, 'finance')
$$;

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  invoice_id uuid,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'upi',  -- upi, cheque, cash, bank, card, other
  reference text,
  milestone text,                    -- '10','50','40','custom'
  receipt_url text,
  notes text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_quotation ON public.payments(quotation_id);
CREATE INDEX idx_payments_lead ON public.payments(lead_id);
CREATE INDEX idx_payments_paid_on ON public.payments(paid_on DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance users view payments" ON public.payments FOR SELECT TO authenticated USING (has_finance_access(auth.uid()));
CREATE POLICY "Admin/manager manage payments" ON public.payments FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ INVOICE NUMBERING (FY based: Apr-Mar) ============
CREATE TABLE public.invoice_fy_seq (
  fy_start int PRIMARY KEY,   -- e.g. 2026 means FY 2026-27 (Apr 2026 - Mar 2027)
  last_seq int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_fy_seq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance read seq" ON public.invoice_fy_seq FOR SELECT TO authenticated USING (has_finance_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_fy int;
  v_seq int;
BEGIN
  -- Indian FY: April to March
  IF EXTRACT(MONTH FROM v_today) >= 4 THEN
    v_fy := EXTRACT(YEAR FROM v_today)::int;
  ELSE
    v_fy := EXTRACT(YEAR FROM v_today)::int - 1;
  END IF;

  INSERT INTO public.invoice_fy_seq(fy_start, last_seq) VALUES (v_fy, 1)
    ON CONFLICT (fy_start) DO UPDATE SET last_seq = invoice_fy_seq.last_seq + 1, updated_at = now()
    RETURNING last_seq INTO v_seq;

  RETURN 'HC-INV-' || v_fy::text || '-' || LPAD(v_seq::text, 4, '0');
END;
$$;

-- ============ INVOICES ============
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_address text,
  milestone text,                       -- '10','50','40','custom'
  milestone_label text,                 -- 'Booking 10%', etc.
  amount numeric NOT NULL DEFAULT 0,
  gst_enabled boolean NOT NULL DEFAULT true,
  gst_rate numeric NOT NULL DEFAULT 18,
  gst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  status text NOT NULL DEFAULT 'draft', -- draft, issued, paid, overdue, cancelled
  paid_amount numeric NOT NULL DEFAULT 0,
  paid_on date,
  pdf_url text,
  notes text,
  last_reminder_at timestamptz,
  reminder_count int NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_quotation ON public.invoices(quotation_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance view invoices" ON public.invoices FOR SELECT TO authenticated USING (has_finance_access(auth.uid()));
CREATE POLICY "Admin/manager manage invoices" ON public.invoices FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-assign invoice number on insert if blank
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.next_invoice_number();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_invoices_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

-- ============ EXPENSES ============
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'material',  -- material, labour, transport, overhead, other
  vendor text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  payment_mode text DEFAULT 'cash',
  reference text,
  receipt_url text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_quotation ON public.expenses(quotation_id);
CREATE INDEX idx_expenses_lead ON public.expenses(lead_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses(category);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance view expenses" ON public.expenses FOR SELECT TO authenticated USING (has_finance_access(auth.uid()));
CREATE POLICY "Admin/manager manage expenses" ON public.expenses FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REMINDER LOG ============
CREATE TABLE public.finance_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  channel text NOT NULL,         -- email, whatsapp
  sent_to text,
  status text NOT NULL,          -- sent, failed, queued
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_reminder_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance view reminder log" ON public.finance_reminder_log FOR SELECT TO authenticated USING (has_finance_access(auth.uid()));
CREATE POLICY "Admin/manager manage reminder log" ON public.finance_reminder_log FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('finance-receipts', 'finance-receipts', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Finance read receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'finance-receipts' AND has_finance_access(auth.uid()));
CREATE POLICY "Admin/manager upload receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'finance-receipts' AND is_admin_or_manager(auth.uid()));
CREATE POLICY "Admin/manager update receipts" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'finance-receipts' AND is_admin_or_manager(auth.uid()));
CREATE POLICY "Admin/manager delete receipts" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'finance-receipts' AND is_admin_or_manager(auth.uid()));

-- ============ HELPER VIEW: Outstanding per invoice ============
CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  UPDATE public.invoices
    SET status = 'overdue'
    WHERE status = 'issued'
      AND due_date < CURRENT_DATE
      AND paid_amount < total_amount;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;