
ALTER TABLE public.brand_catalog DROP CONSTRAINT IF EXISTS brand_catalog_category_key_key;
ALTER TABLE public.brand_catalog ADD CONSTRAINT brand_catalog_tenant_category_key_key UNIQUE (tenant_id, category, key);

ALTER TABLE public.material_pricing DROP CONSTRAINT IF EXISTS material_pricing_scope_key_key;
ALTER TABLE public.material_pricing ADD CONSTRAINT material_pricing_tenant_scope_key_key UNIQUE (tenant_id, scope, key);

ALTER TABLE public.material_room_pricing DROP CONSTRAINT IF EXISTS material_room_pricing_material_key_room_key_category_key_key;
ALTER TABLE public.material_room_pricing ADD CONSTRAINT material_room_pricing_tenant_keys_key UNIQUE (tenant_id, material_key, room_key, category_key);
