
ALTER TABLE public.pricing_rooms DROP CONSTRAINT IF EXISTS pricing_rooms_key_key;
ALTER TABLE public.pricing_rooms ADD CONSTRAINT pricing_rooms_tenant_key_key UNIQUE (tenant_id, key);

ALTER TABLE public.pricing_item_categories DROP CONSTRAINT IF EXISTS pricing_item_categories_key_key;
ALTER TABLE public.pricing_item_categories ADD CONSTRAINT pricing_item_categories_tenant_key_key UNIQUE (tenant_id, key);
