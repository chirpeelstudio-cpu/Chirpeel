-- 1. Extend quotations table
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

-- 2. Send history table
CREATE TABLE IF NOT EXISTS public.quotation_send_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by text,
  channel text NOT NULL DEFAULT 'whatsapp',
  pdf_url text,
  message_body text,
  note text,
  is_revision boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qsh_quotation_id ON public.quotation_send_history(quotation_id);
CREATE INDEX IF NOT EXISTS idx_qsh_sent_at ON public.quotation_send_history(sent_at DESC);

ALTER TABLE public.quotation_send_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View send history (scoped)"
  ON public.quotation_send_history FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quotations q
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE q.id = quotation_send_history.quotation_id
        AND (q.created_by = public.current_profile_identifier()
             OR l.assigned_to = public.current_profile_identifier())
    )
  );

CREATE POLICY "Insert send history (auth)"
  ON public.quotation_send_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Delete send history (admin/manager)"
  ON public.quotation_send_history FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));