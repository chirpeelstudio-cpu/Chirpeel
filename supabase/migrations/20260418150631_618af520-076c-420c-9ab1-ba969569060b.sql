CREATE TABLE public.lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  template_key text,
  template_title text,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  sent_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_messages_lead_id ON public.lead_messages(lead_id);
CREATE INDEX idx_lead_messages_created_at ON public.lead_messages(created_at DESC);

ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lead messages"
  ON public.lead_messages FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert lead messages"
  ON public.lead_messages FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete lead messages"
  ON public.lead_messages FOR DELETE
  TO authenticated USING (true);