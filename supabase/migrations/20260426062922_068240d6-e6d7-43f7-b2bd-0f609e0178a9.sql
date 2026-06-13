-- PO status timeline: history table
CREATE TABLE IF NOT EXISTS public.po_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  note text,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_status_history_po ON public.po_status_history(purchase_order_id, created_at);

ALTER TABLE public.po_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager manage po_status_history"
  ON public.po_status_history FOR ALL
  TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Finance view po_status_history"
  ON public.po_status_history FOR SELECT
  TO authenticated
  USING (has_finance_access(auth.uid()));
