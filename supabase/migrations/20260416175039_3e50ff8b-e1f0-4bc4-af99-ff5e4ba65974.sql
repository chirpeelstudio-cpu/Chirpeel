
-- =========================================================
-- PRICING CATALOG (materials & hardware)
-- =========================================================
CREATE TABLE public.pricing_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('material','hardware')),
  name text NOT NULL,
  rate_per_sqft numeric NOT NULL DEFAULT 0,
  fixed_cost numeric NOT NULL DEFAULT 0,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read pricing"
  ON public.pricing_catalog FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can manage pricing"
  ON public.pricing_catalog FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Seed default materials (rate per sq.ft in INR)
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, sort_order, description) VALUES
  ('material', 'Basic Laminate',    1200, 10, 'Economical laminate finish'),
  ('material', 'Premium Laminate',  1600, 20, 'Premium textured laminate'),
  ('material', 'Acrylic Finish',    2200, 30, 'Glossy acrylic finish'),
  ('material', 'PU Finish',         2800, 40, 'High-end polyurethane finish'),
  ('material', 'Veneer Finish',     3200, 50, 'Natural wood veneer');

-- Seed default hardware
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, sort_order, description) VALUES
  ('hardware', 'Basic Hinges',          0,   0,    10, 'Standard hinges included'),
  ('hardware', 'Soft Close Hinges',     150, 0,    20, 'Soft-close hinges per sq.ft'),
  ('hardware', 'Premium (Blum/Hettich)',350, 0,    30, 'Premium imported hardware');

-- =========================================================
-- QUOTATIONS
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS public.quotation_number_seq START 1001;

CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text NOT NULL UNIQUE DEFAULT ('HC-Q-' || nextval('public.quotation_number_seq')::text),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,

  -- Customer
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  project_location text,

  -- Project
  project_name text,
  project_type text,
  sales_person text,
  quotation_date date NOT NULL DEFAULT CURRENT_DATE,
  validity_days int NOT NULL DEFAULT 15,

  -- Pricing
  subtotal numeric NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','amount')),
  discount_value numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  gst_enabled boolean NOT NULL DEFAULT true,
  gst_rate numeric NOT NULL DEFAULT 18,
  gst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,

  -- Format & content
  template_format text NOT NULL DEFAULT 'detailed' CHECK (template_format IN ('detailed','summary','premium')),
  terms_conditions text,
  notes text,

  -- Status & files
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','rejected')),
  pdf_url text,
  sent_at timestamptz,

  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage quotations"
  ON public.quotations FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_quotations_lead ON public.quotations(lead_id);
CREATE INDEX idx_quotations_status ON public.quotations(status);
CREATE INDEX idx_quotations_created ON public.quotations(created_at DESC);

-- =========================================================
-- QUOTATION ROOMS
-- =========================================================
CREATE TABLE public.quotation_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  room_name text NOT NULL,
  width_ft numeric NOT NULL DEFAULT 0,
  height_ft numeric NOT NULL DEFAULT 0,
  depth_ft numeric,
  area_sqft numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 1,

  material_id uuid REFERENCES public.pricing_catalog(id) ON DELETE SET NULL,
  material_name text,
  material_rate numeric NOT NULL DEFAULT 0,

  hardware_id uuid REFERENCES public.pricing_catalog(id) ON DELETE SET NULL,
  hardware_name text,
  hardware_rate numeric NOT NULL DEFAULT 0,
  hardware_fixed numeric NOT NULL DEFAULT 0,

  custom_cost numeric NOT NULL DEFAULT 0,
  notes text,
  total_cost numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotation_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage quotation_rooms"
  ON public.quotation_rooms FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_quotation_rooms_quotation ON public.quotation_rooms(quotation_id);

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_pricing_catalog_updated
  BEFORE UPDATE ON public.pricing_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_quotations_updated
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- STORAGE BUCKET FOR QUOTATION PDFs
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('quotations', 'quotations', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read quotation PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quotations');

CREATE POLICY "Authenticated can upload quotation PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quotations');

CREATE POLICY "Authenticated can update quotation PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'quotations');

CREATE POLICY "Authenticated can delete quotation PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'quotations');
