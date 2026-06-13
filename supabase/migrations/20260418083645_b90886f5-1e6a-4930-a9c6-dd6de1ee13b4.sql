
-- 0. Loosen category check to allow new types
ALTER TABLE public.pricing_catalog DROP CONSTRAINT IF EXISTS pricing_catalog_category_check;
ALTER TABLE public.pricing_catalog
  ADD CONSTRAINT pricing_catalog_category_check
  CHECK (category IN ('material','hardware','unit','accessory','service'));

-- 1. Extend pricing_catalog (idempotent if previous partial run added them)
ALTER TABLE public.pricing_catalog
  ADD COLUMN IF NOT EXISTS room_type text,
  ADD COLUMN IF NOT EXISTS item_category text,
  ADD COLUMN IF NOT EXISTS item_type text;

-- 2. quotation_room_items
CREATE TABLE IF NOT EXISTS public.quotation_room_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_room_id uuid NOT NULL,
  catalog_id uuid,
  item_name text NOT NULL,
  item_category text NOT NULL,
  item_type text NOT NULL,
  width_ft numeric NOT NULL DEFAULT 0,
  height_ft numeric NOT NULL DEFAULT 0,
  area_sqft numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 1,
  rate numeric NOT NULL DEFAULT 0,
  pricing_mode text NOT NULL DEFAULT 'sqft',
  total_cost numeric NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qri_room ON public.quotation_room_items(quotation_room_id);
ALTER TABLE public.quotation_room_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can manage room items" ON public.quotation_room_items;
CREATE POLICY "Authenticated can manage room items"
  ON public.quotation_room_items FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- 3. Add core material fields to quotation_rooms
ALTER TABLE public.quotation_rooms
  ADD COLUMN IF NOT EXISTS room_type text,
  ADD COLUMN IF NOT EXISTS core_material_id uuid,
  ADD COLUMN IF NOT EXISTS core_material_name text,
  ADD COLUMN IF NOT EXISTS core_material_rate numeric NOT NULL DEFAULT 0;

-- 4. Seed Core Materials
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('material', 'BWP Plywood',           1450, 0, 'all', 'core_material', 'core_material', 1, true),
  ('material', 'HDHMR',                 1350, 0, 'all', 'core_material', 'core_material', 2, true),
  ('material', 'MR MDF',                1100, 0, 'all', 'core_material', 'core_material', 3, true),
  ('material', 'Prelam Particle Board',  850, 0, 'all', 'core_material', 'core_material', 4, true);

-- 5. Kitchen units
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('unit', 'Base Unit',       0, 0, 'kitchen', 'units', 'unit_sqft', 10, true),
  ('unit', 'Wall Unit',       0, 0, 'kitchen', 'units', 'unit_sqft', 11, true),
  ('unit', 'Open Unit',       0, 0, 'kitchen', 'units', 'unit_sqft', 12, true),
  ('unit', 'Tall Unit',       0, 0, 'kitchen', 'units', 'unit_sqft', 13, true),
  ('unit', 'Loft',            0, 0, 'kitchen', 'units', 'unit_sqft', 14, true),
  ('unit', 'Wall Panelling',  0, 0, 'kitchen', 'units', 'unit_sqft', 15, true);

-- 6. Kitchen accessories
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('accessory', 'Tandem Drawer',     0, 4500, 'kitchen', 'accessories', 'accessory_fixed', 20, true),
  ('accessory', 'Oil Pullout',       0, 3200, 'kitchen', 'accessories', 'accessory_fixed', 21, true),
  ('accessory', 'Plate Rack',        0, 2800, 'kitchen', 'accessories', 'accessory_fixed', 22, true),
  ('accessory', 'Detergent Holder',  0,  900, 'kitchen', 'accessories', 'accessory_fixed', 23, true),
  ('accessory', 'Tandem Matt',       0,  450, 'kitchen', 'accessories', 'accessory_fixed', 24, true),
  ('accessory', 'Dustbin Holder',    0, 1200, 'kitchen', 'accessories', 'accessory_fixed', 25, true),
  ('accessory', 'Dustbin',           0,  800, 'kitchen', 'accessories', 'accessory_fixed', 26, true);

-- 7. Bedroom
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('unit',      'Wardrobe',           0,     0, 'bedroom', 'units', 'unit_sqft',        30, true),
  ('unit',      'Loft',               0,     0, 'bedroom', 'units', 'unit_sqft',        31, true),
  ('unit',      'Dressing Unit',      0,     0, 'bedroom', 'units', 'unit_sqft',        32, true),
  ('unit',      'False Ceiling',     85,     0, 'bedroom', 'units', 'unit_sqft',        33, true),
  ('accessory', 'Cot',                0, 18000, 'bedroom', 'units', 'accessory_fixed',  34, true),
  ('accessory', 'Cot with Hydraulic', 0, 28000, 'bedroom', 'units', 'accessory_fixed',  35, true),
  ('unit',      'Headboard',          0,     0, 'bedroom', 'units', 'unit_sqft',        36, true),
  ('accessory', 'Side Table',         0,  4500, 'bedroom', 'units', 'accessory_fixed',  37, true),
  ('unit',      'Wall Panelling',     0,     0, 'bedroom', 'units', 'unit_sqft',        38, true);

-- 8. Living Room
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('unit', 'Base Unit with Drawer',  0,  0, 'living_room', 'units', 'unit_sqft', 40, true),
  ('unit', 'Base Unit',              0,  0, 'living_room', 'units', 'unit_sqft', 41, true),
  ('unit', 'TV Back Panelling',      0,  0, 'living_room', 'units', 'unit_sqft', 42, true),
  ('unit', 'False Ceiling',         85,  0, 'living_room', 'units', 'unit_sqft', 43, true),
  ('unit', 'Wall Panelling',         0,  0, 'living_room', 'units', 'unit_sqft', 44, true);

-- 9. Painting & Electrical (all rooms)
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('service', 'Painting',   35, 0, 'all', 'painting',   'painting',   90, true),
  ('service', 'Electrical',  0, 0, 'all', 'electrical', 'electrical', 91, true);
