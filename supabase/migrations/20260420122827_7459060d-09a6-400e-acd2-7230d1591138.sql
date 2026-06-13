-- Per-room × per-category material rate overrides
CREATE TABLE public.material_room_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_key text NOT NULL,
  room_key text NOT NULL,
  category_key text NOT NULL,
  rate_per_sqft numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_key, room_key, category_key)
);

CREATE INDEX idx_material_room_pricing_lookup
  ON public.material_room_pricing (material_key, room_key, category_key);

ALTER TABLE public.material_room_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view material_room_pricing"
  ON public.material_room_pricing
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/manager manage material_room_pricing"
  ON public.material_room_pricing
  FOR ALL
  TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_material_room_pricing_updated_at
  BEFORE UPDATE ON public.material_room_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();