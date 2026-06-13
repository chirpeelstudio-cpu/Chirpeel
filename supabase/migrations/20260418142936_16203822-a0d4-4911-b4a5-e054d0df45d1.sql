ALTER TABLE public.quotation_rooms
ADD COLUMN IF NOT EXISTS shutter_finish text;

INSERT INTO public.pricing_catalog (name, category, item_category, item_type, room_type, rate_per_sqft, sort_order, active)
SELECT v.name, 'material', 'core_material', 'core_material', 'all', 0, v.sort_order, true
FROM (VALUES
  ('MR Plywood', 1),
  ('BWP Plywood', 2),
  ('MDF (Medium Density Fiber Board)', 3),
  ('HDHMR (High Density High Moisture Resistance)', 4),
  ('Prelam Particle Board', 5)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.pricing_catalog pc
  WHERE pc.name = v.name AND pc.item_category = 'core_material'
);