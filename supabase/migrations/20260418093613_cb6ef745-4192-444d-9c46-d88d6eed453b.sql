ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS hardware_brand text,
  ADD COLUMN IF NOT EXISTS core_material_brand text,
  ADD COLUMN IF NOT EXISTS laminate_brand text;