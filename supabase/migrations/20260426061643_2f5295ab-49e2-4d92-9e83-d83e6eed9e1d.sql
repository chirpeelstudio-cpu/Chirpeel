-- ============ BOQ feature schema ============

-- 1. Catalog of products
CREATE TABLE public.boq_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('wood','false_ceiling','lighting','electrical','paint')),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'nos',
  default_rate numeric NOT NULL DEFAULT 0,
  description text,
  active boolean NOT NULL DEFAULT true,
  is_preset boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_boq_products_category ON public.boq_products(category) WHERE active;

ALTER TABLE public.boq_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view boq_products" ON public.boq_products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager manage boq_products" ON public.boq_products
  FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_boq_products_updated BEFORE UPDATE ON public.boq_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Product <-> vendor links
CREATE TABLE public.boq_product_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boq_product_id uuid NOT NULL REFERENCES public.boq_products(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL,
  is_preferred boolean NOT NULL DEFAULT false,
  unit_rate numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (boq_product_id, vendor_id)
);
CREATE INDEX idx_boq_product_vendors_product ON public.boq_product_vendors(boq_product_id);
CREATE INDEX idx_boq_product_vendors_vendor ON public.boq_product_vendors(vendor_id);

ALTER TABLE public.boq_product_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view boq_product_vendors" ON public.boq_product_vendors
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager manage boq_product_vendors" ON public.boq_product_vendors
  FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));

-- 3. Project BOQ line items
CREATE TABLE public.project_boq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  boq_product_id uuid REFERENCES public.boq_products(id) ON DELETE SET NULL,
  category text NOT NULL,
  item_name text NOT NULL,
  unit text NOT NULL DEFAULT 'nos',
  quantity numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  vendor_id uuid,
  notes text,
  po_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_boq_items_project ON public.project_boq_items(project_id);
CREATE INDEX idx_project_boq_items_po ON public.project_boq_items(po_id);

ALTER TABLE public.project_boq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/manager manage project_boq_items" ON public.project_boq_items
  FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "PM manage own project boq items" ON public.project_boq_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_boq_items.project_id AND p.project_manager = current_profile_identifier()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_boq_items.project_id AND p.project_manager = current_profile_identifier()));

CREATE TRIGGER trg_project_boq_items_updated BEFORE UPDATE ON public.project_boq_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. PO dispatch log
CREATE TABLE public.vendor_po_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email')),
  recipient text,
  status text NOT NULL,
  error text,
  sent_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vendor_po_dispatch_log_po ON public.vendor_po_dispatch_log(purchase_order_id);

ALTER TABLE public.vendor_po_dispatch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/manager manage dispatch log" ON public.vendor_po_dispatch_log
  FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "Finance view dispatch log" ON public.vendor_po_dispatch_log
  FOR SELECT TO authenticated USING (has_finance_access(auth.uid()));

-- 5. Seed presets
INSERT INTO public.boq_products (category, name, unit, default_rate, is_preset, sort_order) VALUES
  -- Wood
  ('wood','Plywood 19mm BWP','sheet',2400,true,10),
  ('wood','Plywood 12mm BWR','sheet',1600,true,20),
  ('wood','MDF Board 18mm','sheet',1200,true,30),
  ('wood','HDHMR 18mm','sheet',2200,true,40),
  ('wood','Particle Board 18mm','sheet',900,true,50),
  ('wood','Veneer Oak','sqft',180,true,60),
  ('wood','Laminate 1mm (Greenlam/Merino)','sheet',1800,true,70),
  ('wood','Edge Banding 22mm','rft',12,true,80),
  -- False ceiling
  ('false_ceiling','Gypsum Board 12mm','sqft',95,true,10),
  ('false_ceiling','Grid Channel 0.55mm','rft',38,true,20),
  ('false_ceiling','POP Punning','sqft',60,true,30),
  ('false_ceiling','Cornice Moulding','rft',85,true,40),
  ('false_ceiling','Calcium Silicate Board','sqft',130,true,50),
  ('false_ceiling','PVC Ceiling Panel','sqft',75,true,60),
  -- Lighting
  ('lighting','LED Panel 18W Round','nos',420,true,10),
  ('lighting','LED Spot Light 7W','nos',180,true,20),
  ('lighting','LED Strip 5m (Warm White)','nos',650,true,30),
  ('lighting','Profile Light Aluminium','rft',240,true,40),
  ('lighting','Pendant Light Decorative','nos',1800,true,50),
  ('lighting','Cove Light Driver 60W','nos',850,true,60),
  ('lighting','Chandelier (Standard)','nos',6500,true,70),
  -- Electrical
  ('electrical','MCB 32A SP','nos',180,true,10),
  ('electrical','MCB 63A DP','nos',420,true,20),
  ('electrical','Modular Switch 6A','nos',95,true,30),
  ('electrical','Modular Socket 16A','nos',180,true,40),
  ('electrical','Switch Plate 12 Module','nos',650,true,50),
  ('electrical','Wire 2.5sqmm 90m','coil',2400,true,60),
  ('electrical','Wire 4sqmm 90m','coil',3800,true,70),
  ('electrical','Conduit Pipe 25mm','rft',18,true,80),
  ('electrical','Distribution Box 8-Way','nos',1800,true,90),
  -- Paint
  ('paint','Asian Royale Luxury Emulsion 4L','nos',1450,true,10),
  ('paint','Asian Apex Exterior 10L','nos',2800,true,20),
  ('paint','Berger Silk 4L','nos',1380,true,30),
  ('paint','Wall Putty 40kg','bag',1100,true,40),
  ('paint','Primer Water Based 10L','nos',1200,true,50),
  ('paint','Texture Paint Premium','sqft',45,true,60),
  ('paint','PU Polish (per coat)','sqft',55,true,70);