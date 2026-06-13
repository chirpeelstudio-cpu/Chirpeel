INSERT INTO public.material_pricing (scope, key, label, rate_per_sqft, sort_order) VALUES
  ('acrylic', 'praveedh', 'Praveedh', 0, 1),
  ('acrylic', 'rehau', 'Rehau', 0, 2)
ON CONFLICT DO NOTHING;