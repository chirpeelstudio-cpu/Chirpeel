
-- ============ VENDORS ============
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  contact_person text,
  phone text,
  email text,
  gstin text,
  address text,
  payment_terms text,
  rating numeric DEFAULT 0,
  notes text,
  active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager manage vendors" ON public.vendors
  FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated view vendors" ON public.vendors
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sequence for PO numbering
CREATE SEQUENCE IF NOT EXISTS public.purchase_order_seq START 1000;

-- ============ PROJECTS ============
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lead_id uuid,
  quotation_id uuid,
  project_type text,
  site_address text,
  start_date date,
  target_end_date date,
  actual_end_date date,
  status text NOT NULL DEFAULT 'planning',
  progress_pct numeric NOT NULL DEFAULT 0,
  budget numeric NOT NULL DEFAULT 0,
  project_manager text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager manage projects" ON public.projects
  FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "PM view own projects" ON public.projects
  FOR SELECT TO authenticated
  USING (project_manager = current_profile_identifier());

CREATE POLICY "PM update own projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (project_manager = current_profile_identifier())
  WITH CHECK (project_manager = current_profile_identifier());

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PURCHASE ORDERS ============
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL DEFAULT ('HC-PO-' || nextval('public.purchase_order_seq')::text),
  vendor_id uuid NOT NULL,
  project_id uuid,
  lead_id uuid,
  po_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  gst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  description text,
  attachment_url text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager manage POs" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Finance view POs" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (has_finance_access(auth.uid()));

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_po_vendor ON public.purchase_orders(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_po_project ON public.purchase_orders(project_id) WHERE deleted_at IS NULL;

-- ============ PROJECT MILESTONES ============
CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  target_date date,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager manage milestones" ON public.project_milestones
  FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "PM manage own project milestones" ON public.project_milestones
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_milestones.project_id AND p.project_manager = current_profile_identifier()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_milestones.project_id AND p.project_manager = current_profile_identifier()));

CREATE TRIGGER trg_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_milestones_project ON public.project_milestones(project_id);

-- ============ PROJECT MATERIALS ============
CREATE TABLE public.project_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  item_name text NOT NULL,
  qty_required numeric NOT NULL DEFAULT 0,
  qty_received numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'nos',
  vendor_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager manage materials" ON public.project_materials
  FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "PM manage own project materials" ON public.project_materials
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_materials.project_id AND p.project_manager = current_profile_identifier()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_materials.project_id AND p.project_manager = current_profile_identifier()));

CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON public.project_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_materials_project ON public.project_materials(project_id);

-- ============ TASKS: link to projects ============
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_id uuid;
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);

-- ============ Default permission keys (extend profiles) ============
-- Existing profiles already use a jsonb permissions field; new keys default to false at app layer.
