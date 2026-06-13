ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS client_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_link_url text,
  ADD COLUMN IF NOT EXISTS payment_link_id text,
  ADD COLUMN IF NOT EXISTS auto_project_id uuid;

CREATE INDEX IF NOT EXISTS idx_quotations_auto_project_id ON public.quotations(auto_project_id);