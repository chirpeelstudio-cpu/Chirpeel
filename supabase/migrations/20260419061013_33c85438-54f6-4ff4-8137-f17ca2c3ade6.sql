
-- 1. material_pricing table
CREATE TABLE public.material_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('material','hardware','core_brand','laminate')),
  key text NOT NULL,
  label text NOT NULL,
  rate_per_sqft numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, key)
);

ALTER TABLE public.material_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view material_pricing"
  ON public.material_pricing FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can manage material_pricing"
  ON public.material_pricing FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER material_pricing_set_updated_at
  BEFORE UPDATE ON public.material_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. add material_type_key to quotation_rooms
ALTER TABLE public.quotation_rooms
  ADD COLUMN IF NOT EXISTS material_type_key text;

-- 3. seed rows (rate=0; admin fills in)
INSERT INTO public.material_pricing (scope, key, label, sort_order) VALUES
  ('material','bwp_plywood','BWP Plywood',1),
  ('material','mr_plywood','MR Plywood',2),
  ('material','mdf','MDF',3),
  ('material','hdhmr','HDHMR',4),
  ('material','prelam_pb','Prelam Particle Board',5),
  ('hardware','ebco','Ebco',1),
  ('hardware','hettich','Hettich',2),
  ('hardware','hafele','Hafele',3),
  ('hardware','blum','Blum',4),
  ('core_brand','century','Century',1),
  ('core_brand','greenply','Greenply',2),
  ('core_brand','chirpeel','Homycube',3),
  ('core_brand','sharon','Sharon',4),
  ('laminate','merino','Merino',1),
  ('laminate','century','Century',2),
  ('laminate','airolam','Airolam',3),
  ('laminate','greenlam','Greenlam',4),
  ('laminate','stylam','Stylam',5),
  ('laminate','centurylam','Century Lam',6);
