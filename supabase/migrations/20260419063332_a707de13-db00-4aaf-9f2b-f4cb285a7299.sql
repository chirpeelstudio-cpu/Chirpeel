ALTER TABLE public.material_pricing DROP CONSTRAINT IF EXISTS material_pricing_scope_check;
ALTER TABLE public.material_pricing ADD CONSTRAINT material_pricing_scope_check
  CHECK (scope IN ('material','hardware','core_brand','laminate','shutter_finish'));

INSERT INTO public.material_pricing (scope, key, label, rate_per_sqft, sort_order)
VALUES
  ('shutter_finish', 'laminate', 'Laminate', 0, 1),
  ('shutter_finish', 'acrylic', 'Acrylic', 0, 2),
  ('shutter_finish', 'pu', 'PU (Polyurethane)', 0, 3),
  ('shutter_finish', 'membrane', 'Membrane', 0, 4);