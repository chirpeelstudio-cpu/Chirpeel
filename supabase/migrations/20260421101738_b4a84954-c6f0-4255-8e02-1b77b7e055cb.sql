-- 1. pricing_rooms
CREATE TABLE public.pricing_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_preset boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pricing_rooms"
  ON public.pricing_rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/manager manage pricing_rooms"
  ON public.pricing_rooms FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE TRIGGER pricing_rooms_set_updated_at
  BEFORE UPDATE ON public.pricing_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. pricing_item_categories
CREATE TABLE public.pricing_item_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_preset boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_item_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pricing_item_categories"
  ON public.pricing_item_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/manager manage pricing_item_categories"
  ON public.pricing_item_categories FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE TRIGGER pricing_item_categories_set_updated_at
  BEFORE UPDATE ON public.pricing_item_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. room_category_map
CREATE TABLE public.room_category_map (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_key text NOT NULL,
  category_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_key, category_key)
);

ALTER TABLE public.room_category_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view room_category_map"
  ON public.room_category_map FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/manager manage room_category_map"
  ON public.room_category_map FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE TRIGGER room_category_map_set_updated_at
  BEFORE UPDATE ON public.room_category_map
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed preset rooms (12)
INSERT INTO public.pricing_rooms (key, label, sort_order, is_preset, active) VALUES
  ('kitchen', 'Kitchen', 10, true, true),
  ('master_bedroom', 'Master Bedroom', 20, true, true),
  ('kids_bedroom', 'Kids Bedroom', 30, true, true),
  ('living_room', 'Living Room', 40, true, true),
  ('wardrobe', 'Wardrobe', 50, true, true),
  ('tv_unit', 'TV Unit', 60, true, true),
  ('dining_area', 'Dining Area', 70, true, true),
  ('pooja_unit', 'Pooja Unit', 80, true, true),
  ('study_room', 'Study Room', 90, true, true),
  ('bathroom_vanity', 'Bathroom Vanity', 100, true, true),
  ('foyer', 'Foyer', 110, true, true),
  ('balcony', 'Balcony', 120, true, true)
ON CONFLICT (key) DO NOTHING;

-- Seed preset categories (8)
INSERT INTO public.pricing_item_categories (key, label, sort_order, is_preset, active) VALUES
  ('wardrobe', 'Wardrobe', 10, true, true),
  ('loft', 'Loft', 20, true, true),
  ('base_unit', 'Base Unit', 30, true, true),
  ('wall_unit', 'Wall Unit', 40, true, true),
  ('tv_unit', 'TV Unit', 50, true, true),
  ('vanity', 'Vanity', 60, true, true),
  ('storage', 'Storage', 70, true, true),
  ('other', 'Other', 80, true, true)
ON CONFLICT (key) DO NOTHING;