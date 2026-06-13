-- Create brand_catalog table for admin-managed brands across 11 categories
CREATE TABLE public.brand_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  logo_url text,
  rate_per_sqft numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  is_preset boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, key)
);

CREATE INDEX idx_brand_catalog_category_active ON public.brand_catalog (category, active, sort_order);

ALTER TABLE public.brand_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view brand_catalog"
  ON public.brand_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/manager manage brand_catalog"
  ON public.brand_catalog FOR ALL
  TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_brand_catalog_updated_at
  BEFORE UPDATE ON public.brand_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed preset brands (all 11 categories) with rate_per_sqft pulled from material_pricing where it exists.
-- material_pricing scope mapping: hardware -> 'hardware', core_material -> 'core_brand', laminate -> 'laminate',
-- and others use the same scope name as the category.
INSERT INTO public.brand_catalog (category, key, name, logo_url, rate_per_sqft, sort_order, is_preset, active) VALUES
  -- Hardware
  ('hardware', 'ebco', 'Ebco', NULL, 0, 1, true, true),
  ('hardware', 'hettich', 'Hettich', NULL, 0, 2, true, true),
  ('hardware', 'hafele', 'Hafele', NULL, 0, 3, true, true),
  ('hardware', 'blum', 'Blum', NULL, 0, 4, true, true),
  -- Core material
  ('core_material', 'century', 'Century', NULL, 0, 1, true, true),
  ('core_material', 'greenply', 'Greenply', NULL, 0, 2, true, true),
  ('core_material', 'sharon', 'Sharon', NULL, 0, 3, true, true),
  ('core_material', 'chirpeel', 'Chirpeel', NULL, 0, 4, true, true),
  -- Laminate
  ('laminate', 'merino', 'Merino', NULL, 0, 1, true, true),
  ('laminate', 'airolam', 'Airolam', NULL, 0, 2, true, true),
  ('laminate', 'greenlam', 'Greenlam', NULL, 0, 3, true, true),
  ('laminate', 'stylam', 'Stylam', NULL, 0, 4, true, true),
  ('laminate', 'centurylam', 'Century Lam', NULL, 0, 5, true, true),
  -- Acrylic
  ('acrylic', 'praveedh', 'Praveedh', NULL, 0, 1, true, true),
  ('acrylic', 'rehau', 'Rehau', NULL, 0, 2, true, true),
  -- Gypsum
  ('gypsum', 'saint_gobain_gyproc', 'Saint-Gobain Gyproc', NULL, 0, 1, true, true),
  -- Channel
  ('channel', 'jsw', 'JSW', NULL, 0, 1, true, true),
  ('channel', 'gyproc', 'Gyproc', NULL, 0, 2, true, true),
  ('channel', 'import', 'Import', NULL, 0, 3, true, true),
  -- Paint
  ('paint', 'asian_paints', 'Asian Paints', NULL, 0, 1, true, true),
  ('paint', 'nippon', 'Nippon', NULL, 0, 2, true, true),
  ('paint', 'birla_opus', 'Birla Opus', NULL, 0, 3, true, true),
  -- Wiring
  ('wiring', 'havells', 'Havells', NULL, 0, 1, true, true),
  ('wiring', 'polycab', 'Polycab', NULL, 0, 2, true, true),
  ('wiring', 'finolex', 'Finolex', NULL, 0, 3, true, true),
  ('wiring', 'v_guard', 'V-Guard', NULL, 0, 4, true, true),
  -- Switches
  ('switches', 'legrand', 'Legrand', NULL, 0, 1, true, true),
  ('switches', 'anchor', 'Anchor', NULL, 0, 2, true, true),
  ('switches', 'gm', 'GM', NULL, 0, 3, true, true),
  ('switches', 'goldmedal', 'Goldmedal', NULL, 0, 4, true, true)
ON CONFLICT (category, key) DO NOTHING;

-- Sync rate_per_sqft from existing material_pricing rows
-- scope mapping: core_material category <-> 'core_brand' scope; others share name with category
UPDATE public.brand_catalog bc
SET rate_per_sqft = mp.rate_per_sqft
FROM public.material_pricing mp
WHERE bc.key = mp.key
  AND (
    (bc.category = 'core_material' AND mp.scope = 'core_brand')
    OR (bc.category = mp.scope AND bc.category <> 'core_material')
  );