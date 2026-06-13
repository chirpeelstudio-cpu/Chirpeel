
ALTER TABLE public.material_pricing DROP CONSTRAINT IF EXISTS material_pricing_scope_check;
ALTER TABLE public.material_pricing ADD CONSTRAINT material_pricing_scope_check
  CHECK (scope IN ('material','hardware','core_brand','laminate','shutter_finish','acrylic','pu_paint','membrane','gypsum','channel','paint','wiring','switches'));
