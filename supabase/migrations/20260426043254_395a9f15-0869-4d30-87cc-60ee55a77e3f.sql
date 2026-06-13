ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS payment_link_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_status text;