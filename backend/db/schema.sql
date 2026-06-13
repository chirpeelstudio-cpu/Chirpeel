-- ==========================================
-- 00_users.sql (Express Auth Base)
-- ==========================================

-- Custom users table for Express JWT Auth
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==========================================
-- Migration File: 20260320131401_a7b149b4-fc52-4940-8e83-67b9c78b1fe7.sql
-- ==========================================

CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  pincode TEXT,
  city TEXT,
  source TEXT DEFAULT 'popup',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);



-- ==========================================
-- Migration File: 20260321120251_f24fc7ad-da3a-4e21-937e-5cdc99f7d2fd.sql
-- ==========================================

ALTER TABLE public.leads ADD COLUMN resume_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true);



-- ==========================================
-- Migration File: 20260321121144_a2ceca9a-eb56-46fa-84d0-8614ae62ef44.sql
-- ==========================================

ALTER TABLE public.leads ADD COLUMN project_type text;
ALTER TABLE public.leads ADD COLUMN budget text;
ALTER TABLE public.leads ADD COLUMN timeline text;
ALTER TABLE public.leads ADD COLUMN details text;

-- ==========================================
-- Migration File: 20260321122734_45df084b-8211-4ced-8c9d-a6ad3625a12e.sql
-- ==========================================

-- Add floorplan_url column to leads table
ALTER TABLE public.leads ADD COLUMN floorplan_url text;

-- Create floorplans storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('floorplans', 'floorplans', true);

-- Allow anyone to upload to floorplans bucket


-- ==========================================
-- Migration File: 20260323135950_cd91a261-1ff1-4315-b49a-96108ab41505.sql
-- ==========================================


-- Add pipeline columns to leads table
ALTER TABLE leads ADD COLUMN stage text DEFAULT 'leads';
ALTER TABLE leads ADD COLUMN status text DEFAULT 'new_lead';
ALTER TABLE leads ADD COLUMN assigned_to text;
ALTER TABLE leads ADD COLUMN next_followup_date timestamptz;
ALTER TABLE leads ADD COLUMN payment_10_percent boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN payment_50_percent boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN payment_100_percent boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN payment_10_amount numeric;
ALTER TABLE leads ADD COLUMN payment_50_amount numeric;
ALTER TABLE leads ADD COLUMN payment_100_amount numeric;

-- Allow authenticated users to update leads

-- Follow-ups table
CREATE TABLE lead_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  note text,
  follow_up_date timestamptz NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Project files table
CREATE TABLE project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text DEFAULT 'document',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Team members table
CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  phone text,
  email text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', true);



-- ==========================================
-- Migration File: 20260324122330_bfaada49-f99b-4459-aead-be1abe562661.sql
-- ==========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- ==========================================
-- Migration File: 20260408050503_7fd20b78-6f57-4a56-98c5-b2168648a407.sql
-- ==========================================



-- ==========================================
-- Migration File: 20260414143834_ca96da0c-1d48-4ceb-9c40-8ae7019bd27c.sql
-- ==========================================

ALTER TABLE public.lead_follow_ups 
ADD COLUMN outcome text DEFAULT NULL,
ADD COLUMN completed_at timestamp with time zone DEFAULT NULL;

-- ==========================================
-- Migration File: 20260416175039_3e50ff8b-e1f0-4bc4-af99-ff5e4ba65974.sql
-- ==========================================


-- =========================================================
-- PRICING CATALOG (materials & hardware)
-- =========================================================
CREATE TABLE public.pricing_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('material','hardware')),
  name text NOT NULL,
  rate_per_sqft numeric NOT NULL DEFAULT 0,
  fixed_cost numeric NOT NULL DEFAULT 0,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default materials (rate per sq.ft in INR)
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, sort_order, description) VALUES
  ('material', 'Basic Laminate',    1200, 10, 'Economical laminate finish'),
  ('material', 'Premium Laminate',  1600, 20, 'Premium textured laminate'),
  ('material', 'Acrylic Finish',    2200, 30, 'Glossy acrylic finish'),
  ('material', 'PU Finish',         2800, 40, 'High-end polyurethane finish'),
  ('material', 'Veneer Finish',     3200, 50, 'Natural wood veneer');

-- Seed default hardware
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, sort_order, description) VALUES
  ('hardware', 'Basic Hinges',          0,   0,    10, 'Standard hinges included'),
  ('hardware', 'Soft Close Hinges',     150, 0,    20, 'Soft-close hinges per sq.ft'),
  ('hardware', 'Premium (Blum/Hettich)',350, 0,    30, 'Premium imported hardware');

-- =========================================================
-- QUOTATIONS
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS public.quotation_number_seq START 1001;

CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text NOT NULL UNIQUE DEFAULT ('HC-Q-' || nextval('public.quotation_number_seq')::text),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,

  -- Customer
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  project_location text,

  -- Project
  project_name text,
  project_type text,
  sales_person text,
  quotation_date date NOT NULL DEFAULT CURRENT_DATE,
  validity_days int NOT NULL DEFAULT 15,

  -- Pricing
  subtotal numeric NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','amount')),
  discount_value numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  gst_enabled boolean NOT NULL DEFAULT true,
  gst_rate numeric NOT NULL DEFAULT 18,
  gst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,

  -- Format & content
  template_format text NOT NULL DEFAULT 'detailed' CHECK (template_format IN ('detailed','summary','premium')),
  terms_conditions text,
  notes text,

  -- Status & files
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','rejected')),
  pdf_url text,
  sent_at timestamptz,

  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotations_lead ON public.quotations(lead_id);
CREATE INDEX idx_quotations_status ON public.quotations(status);
CREATE INDEX idx_quotations_created ON public.quotations(created_at DESC);

-- =========================================================
-- QUOTATION ROOMS
-- =========================================================
CREATE TABLE public.quotation_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  room_name text NOT NULL,
  width_ft numeric NOT NULL DEFAULT 0,
  height_ft numeric NOT NULL DEFAULT 0,
  depth_ft numeric,
  area_sqft numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 1,

  material_id uuid REFERENCES public.pricing_catalog(id) ON DELETE SET NULL,
  material_name text,
  material_rate numeric NOT NULL DEFAULT 0,

  hardware_id uuid REFERENCES public.pricing_catalog(id) ON DELETE SET NULL,
  hardware_name text,
  hardware_rate numeric NOT NULL DEFAULT 0,
  hardware_fixed numeric NOT NULL DEFAULT 0,

  custom_cost numeric NOT NULL DEFAULT 0,
  notes text,
  total_cost numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotation_rooms_quotation ON public.quotation_rooms(quotation_id);

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_pricing_catalog_updated
  BEFORE UPDATE ON public.pricing_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_quotations_updated
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- STORAGE BUCKET FOR QUOTATION PDFs
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('quotations', 'quotations', true)
ON CONFLICT (id) DO NOTHING;



-- ==========================================
-- Migration File: 20260418083645_b90886f5-1e6a-4930-a9c6-dd6de1ee13b4.sql
-- ==========================================


-- 0. Loosen category check to allow new types
ALTER TABLE public.pricing_catalog DROP CONSTRAINT IF EXISTS pricing_catalog_category_check;
ALTER TABLE public.pricing_catalog
  ADD CONSTRAINT pricing_catalog_category_check
  CHECK (category IN ('material','hardware','unit','accessory','service'));

-- 1. Extend pricing_catalog (idempotent if previous partial run added them)
ALTER TABLE public.pricing_catalog
  ADD COLUMN IF NOT EXISTS room_type text,
  ADD COLUMN IF NOT EXISTS item_category text,
  ADD COLUMN IF NOT EXISTS item_type text;

-- 2. quotation_room_items
CREATE TABLE IF NOT EXISTS public.quotation_room_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_room_id uuid NOT NULL,
  catalog_id uuid,
  item_name text NOT NULL,
  item_category text NOT NULL,
  item_type text NOT NULL,
  width_ft numeric NOT NULL DEFAULT 0,
  height_ft numeric NOT NULL DEFAULT 0,
  area_sqft numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 1,
  rate numeric NOT NULL DEFAULT 0,
  pricing_mode text NOT NULL DEFAULT 'sqft',
  total_cost numeric NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qri_room ON public.quotation_room_items(quotation_room_id);

-- 3. Add core material fields to quotation_rooms
ALTER TABLE public.quotation_rooms
  ADD COLUMN IF NOT EXISTS room_type text,
  ADD COLUMN IF NOT EXISTS core_material_id uuid,
  ADD COLUMN IF NOT EXISTS core_material_name text,
  ADD COLUMN IF NOT EXISTS core_material_rate numeric NOT NULL DEFAULT 0;

-- 4. Seed Core Materials
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('material', 'BWP Plywood',           1450, 0, 'all', 'core_material', 'core_material', 1, true),
  ('material', 'HDHMR',                 1350, 0, 'all', 'core_material', 'core_material', 2, true),
  ('material', 'MR MDF',                1100, 0, 'all', 'core_material', 'core_material', 3, true),
  ('material', 'Prelam Particle Board',  850, 0, 'all', 'core_material', 'core_material', 4, true);

-- 5. Kitchen units
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('unit', 'Base Unit',       0, 0, 'kitchen', 'units', 'unit_sqft', 10, true),
  ('unit', 'Wall Unit',       0, 0, 'kitchen', 'units', 'unit_sqft', 11, true),
  ('unit', 'Open Unit',       0, 0, 'kitchen', 'units', 'unit_sqft', 12, true),
  ('unit', 'Tall Unit',       0, 0, 'kitchen', 'units', 'unit_sqft', 13, true),
  ('unit', 'Loft',            0, 0, 'kitchen', 'units', 'unit_sqft', 14, true),
  ('unit', 'Wall Panelling',  0, 0, 'kitchen', 'units', 'unit_sqft', 15, true);

-- 6. Kitchen accessories
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('accessory', 'Tandem Drawer',     0, 4500, 'kitchen', 'accessories', 'accessory_fixed', 20, true),
  ('accessory', 'Oil Pullout',       0, 3200, 'kitchen', 'accessories', 'accessory_fixed', 21, true),
  ('accessory', 'Plate Rack',        0, 2800, 'kitchen', 'accessories', 'accessory_fixed', 22, true),
  ('accessory', 'Detergent Holder',  0,  900, 'kitchen', 'accessories', 'accessory_fixed', 23, true),
  ('accessory', 'Tandem Matt',       0,  450, 'kitchen', 'accessories', 'accessory_fixed', 24, true),
  ('accessory', 'Dustbin Holder',    0, 1200, 'kitchen', 'accessories', 'accessory_fixed', 25, true),
  ('accessory', 'Dustbin',           0,  800, 'kitchen', 'accessories', 'accessory_fixed', 26, true);

-- 7. Bedroom
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('unit',      'Wardrobe',           0,     0, 'bedroom', 'units', 'unit_sqft',        30, true),
  ('unit',      'Loft',               0,     0, 'bedroom', 'units', 'unit_sqft',        31, true),
  ('unit',      'Dressing Unit',      0,     0, 'bedroom', 'units', 'unit_sqft',        32, true),
  ('unit',      'False Ceiling',     85,     0, 'bedroom', 'units', 'unit_sqft',        33, true),
  ('accessory', 'Cot',                0, 18000, 'bedroom', 'units', 'accessory_fixed',  34, true),
  ('accessory', 'Cot with Hydraulic', 0, 28000, 'bedroom', 'units', 'accessory_fixed',  35, true),
  ('unit',      'Headboard',          0,     0, 'bedroom', 'units', 'unit_sqft',        36, true),
  ('accessory', 'Side Table',         0,  4500, 'bedroom', 'units', 'accessory_fixed',  37, true),
  ('unit',      'Wall Panelling',     0,     0, 'bedroom', 'units', 'unit_sqft',        38, true);

-- 8. Living Room
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('unit', 'Base Unit with Drawer',  0,  0, 'living_room', 'units', 'unit_sqft', 40, true),
  ('unit', 'Base Unit',              0,  0, 'living_room', 'units', 'unit_sqft', 41, true),
  ('unit', 'TV Back Panelling',      0,  0, 'living_room', 'units', 'unit_sqft', 42, true),
  ('unit', 'False Ceiling',         85,  0, 'living_room', 'units', 'unit_sqft', 43, true),
  ('unit', 'Wall Panelling',         0,  0, 'living_room', 'units', 'unit_sqft', 44, true);

-- 9. Painting & Electrical (all rooms)
INSERT INTO public.pricing_catalog (category, name, rate_per_sqft, fixed_cost, room_type, item_category, item_type, sort_order, active) VALUES
  ('service', 'Painting',   35, 0, 'all', 'painting',   'painting',   90, true),
  ('service', 'Electrical',  0, 0, 'all', 'electrical', 'electrical', 91, true);


-- ==========================================
-- Migration File: 20260418090632_afae0922-a46b-4aec-992e-36394ed7095c.sql
-- ==========================================


-- Company settings table (single row)
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Chirpeel Interiors',
  tagline text DEFAULT 'Premium Interiors · 10-Year Warranty',
  address_line1 text DEFAULT 'SF No.392/1, Nehru Street',
  address_line2 text DEFAULT 'Annuparpalayam, Thirumuruganpoondi',
  city text DEFAULT 'Tiruppur',
  state text DEFAULT 'Tamil Nadu',
  pincode text DEFAULT '641652',
  phone text DEFAULT '+91 90030 47474',
  whatsapp text DEFAULT '+91 90030 47474',
  email text DEFAULT 'hello@chirpeel.com',
  website text DEFAULT 'chirpeel.com',
  gstin text DEFAULT '',
  logo_url text DEFAULT '',
  logo_size text NOT NULL DEFAULT 'md',
  header_color text NOT NULL DEFAULT '#0F2C5F',
  accent_color text NOT NULL DEFAULT '#0F2C5F',
  footer_note text DEFAULT 'Thank you for choosing Chirpeel Interiors · This is a computer-generated quotation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial row
INSERT INTO public.company_settings DEFAULT VALUES;

-- Storage bucket for logos & branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;



-- ==========================================
-- Migration File: 20260418092348_be2ae5d2-285d-4b64-bce0-21fe57843fea.sql
-- ==========================================

UPDATE public.company_settings SET logo_url='https://wxycnzteeqnqanupauuh.supabase.co/storage/v1/object/public/company-assets/chirpeel-logo-square.png', logo_size='lg', phone='+91 95858 96733', whatsapp='+91 99948 28179', updated_at=now();

-- ==========================================
-- Migration File: 20260418093613_cb6ef745-4192-444d-9c46-d88d6eed453b.sql
-- ==========================================

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS hardware_brand text,
  ADD COLUMN IF NOT EXISTS core_material_brand text,
  ADD COLUMN IF NOT EXISTS laminate_brand text;

-- ==========================================
-- Migration File: 20260418124200_caa455a6-5883-4474-a2a0-84b7e3e89d1a.sql
-- ==========================================


CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  placeholders text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.message_templates (key, title, body, placeholders) VALUES
('quotation_send', 'Quotation Send',
'Hello {{customer_name}},

Greetings from {{company_name}}!

Please find your interior quotation details below:

📄 Quotation No: {{quotation_number}}
🛠 10-Year Warranty | 🚚 45-Day Delivery | 🔧 After-Sales Support | 🏭 Factory Precision

You can view or download your quotation here:
{{pdf_url}}

Kindly review the quotation and share your feedback. We''d be happy to assist you with any changes or clarifications.

Looking forward to your response.

— Team {{company_name}}',
ARRAY['customer_name','company_name','quotation_number','pdf_url','total_amount']),

('welcome', 'Welcome Message',
'Hello {{customer_name}},

Welcome to {{company_name}}! 🏡

Thank you for reaching out to us. We specialize in premium modular interiors with a 10-Year Warranty and 45-Day Delivery guarantee.

Our design consultant will connect with you shortly to understand your requirements.

— Team {{company_name}}',
ARRAY['customer_name','company_name']),

('ask_floorplan', 'Ask Floor Plan',
'Hello {{customer_name}},

To prepare an accurate quotation for your interiors, kindly share your floor plan (PDF / image) on this WhatsApp chat.

If you don''t have a floor plan, our team can arrange a free site measurement visit.

— Team {{company_name}}',
ARRAY['customer_name','company_name']),

('site_visit_scheduled', 'Site Visit Scheduled',
'Hello {{customer_name}},

Your site visit has been scheduled ✅

📅 Date: {{visit_date}}
⏰ Time: {{visit_time}}
👤 Designer: {{designer_name}}
📍 Location: {{site_address}}

Our team will reach out 30 minutes before arrival. Please ensure access to the site.

— Team {{company_name}}',
ARRAY['customer_name','company_name','visit_date','visit_time','designer_name','site_address']),

('payment_link', 'Payment Link',
'Hello {{customer_name}},

Thank you for confirming your order with {{company_name}}.

💰 Amount Due: ₹{{amount}}
📄 Quotation No: {{quotation_number}}
🔗 Payment Link: {{payment_url}}

Once payment is received, your project moves to production immediately.

— Team {{company_name}}',
ARRAY['customer_name','company_name','amount','quotation_number','payment_url']),

('site_completion', 'Site Completion',
'Hello {{customer_name}},

We''re happy to share that your interior project has been completed! 🎉

📄 Project: {{project_name}}
🛠 10-Year Warranty active from today
📞 Support: {{support_phone}}

We would love to hear your feedback and a Google review would mean the world to us:
{{review_url}}

Thank you for trusting {{company_name}}.

— Team {{company_name}}',
ARRAY['customer_name','company_name','project_name','support_phone','review_url']);


-- ==========================================
-- Migration File: 20260418142936_16203822-a0d4-4911-b4a5-e054d0df45d1.sql
-- ==========================================

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

-- ==========================================
-- Migration File: 20260418144523_9132e47e-589a-4e35-92d5-478b1997b315.sql
-- ==========================================

ALTER TABLE public.quotations ADD COLUMN customer_address text;

-- ==========================================
-- Migration File: 20260418150631_618af520-076c-420c-9ab1-ba969569060b.sql
-- ==========================================

CREATE TABLE public.lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  template_key text,
  template_title text,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  sent_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_messages_lead_id ON public.lead_messages(lead_id);
CREATE INDEX idx_lead_messages_created_at ON public.lead_messages(created_at DESC);



-- ==========================================
-- Migration File: 20260419061013_33c85438-54f6-4ff4-8137-f17ca2c3ade6.sql
-- ==========================================


-- 1. material_pricing table
CREATE TABLE public.material_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('material','hardware','core_brand','laminate')),
  key text NOT NULL,
  label text NOT NULL,
  rate_per_sqft numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, key)
);

CREATE TRIGGER material_pricing_set_updated_at
  BEFORE UPDATE ON public.material_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. add material_type_key to quotation_rooms
ALTER TABLE public.quotation_rooms
  ADD COLUMN IF NOT EXISTS material_type_key text;

-- 3. seed rows (rate=0; admin fills in)
INSERT INTO public.material_pricing (scope, key, label, sort_order) VALUES
  ('material','bwp_plywood','BWP Plywood',1),
  ('material','mr_plywood','MR Plywood',2),
  ('material','mdf','MDF',3),
  ('material','hdhmr','HDHMR',4),
  ('material','prelam_pb','Prelam Particle Board',5),
  ('hardware','ebco','Ebco',1),
  ('hardware','hettich','Hettich',2),
  ('hardware','hafele','Hafele',3),
  ('hardware','blum','Blum',4),
  ('core_brand','century','Century',1),
  ('core_brand','greenply','Greenply',2),
  ('core_brand','chirpeel','Homycube',3),
  ('core_brand','sharon','Sharon',4),
  ('laminate','merino','Merino',1),
  ('laminate','century','Century',2),
  ('laminate','airolam','Airolam',3),
  ('laminate','greenlam','Greenlam',4),
  ('laminate','stylam','Stylam',5),
  ('laminate','centurylam','Century Lam',6);


-- ==========================================
-- Migration File: 20260419063332_a707de13-db00-4aaf-9f2b-f4cb285a7299.sql
-- ==========================================

ALTER TABLE public.material_pricing DROP CONSTRAINT IF EXISTS material_pricing_scope_check;
ALTER TABLE public.material_pricing ADD CONSTRAINT material_pricing_scope_check
  CHECK (scope IN ('material','hardware','core_brand','laminate','shutter_finish'));

INSERT INTO public.material_pricing (scope, key, label, rate_per_sqft, sort_order)
VALUES
  ('shutter_finish', 'laminate', 'Laminate', 0, 1),
  ('shutter_finish', 'acrylic', 'Acrylic', 0, 2),
  ('shutter_finish', 'pu', 'PU (Polyurethane)', 0, 3),
  ('shutter_finish', 'membrane', 'Membrane', 0, 4);

-- ==========================================
-- Migration File: 20260419071524_168830ef-70b9-457e-807c-b1bb62563a12.sql
-- ==========================================

ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS brand_selections jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ==========================================
-- Migration File: 20260419073607_de02700b-8a8e-4f31-aa34-b234c06cf2b4.sql
-- ==========================================


ALTER TABLE public.material_pricing DROP CONSTRAINT IF EXISTS material_pricing_scope_check;
ALTER TABLE public.material_pricing ADD CONSTRAINT material_pricing_scope_check
  CHECK (scope IN ('material','hardware','core_brand','laminate','shutter_finish','acrylic','pu_paint','membrane','gypsum','channel','paint','wiring','switches'));


-- ==========================================
-- Migration File: 20260419080206_09a97e63-34f4-440b-beef-7d822adc2d9f.sql
-- ==========================================

INSERT INTO public.material_pricing (scope, key, label, rate_per_sqft, sort_order) VALUES
  ('acrylic', 'praveedh', 'Praveedh', 0, 1),
  ('acrylic', 'rehau', 'Rehau', 0, 2)
ON CONFLICT DO NOTHING;

-- ==========================================
-- Migration File: 20260420064121_707b3faf-f025-4998-967c-12747fedbcc5.sql
-- ==========================================


-- 1. App role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'designer', 'sales', 'installer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  role_label text,
  active boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '{"overview":true,"leads":true,"quotation":true,"messages":true,"finance":false,"settings":false,"branding":false,"team":false}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Extend team_members with user_id
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- 5. has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 6. has_permission security definer (checks profiles.permissions json)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT (permissions ->> _permission)::boolean FROM public.profiles WHERE id = _user_id), false)
$$;

-- 7. is_admin_or_manager helper
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','manager')
  )
$$;

-- 8. get current profile email helper (for assigned_to matching by email or full_name)
CREATE OR REPLACE FUNCTION public.current_profile_identifier()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(full_name, email) FROM public.profiles WHERE id = auth.uid()
$$;

-- 9. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. updated_at trigger for profiles
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 11. RLS: user_roles (only admins manage; users can read their own)

-- 12. RLS: profiles (users read own + admins all; admins manage)

-- 13. Tighten leads RLS to assigned-only for non admin/manager

-- 14. Tighten lead_messages, lead_follow_ups, project_files (admin/manager all; others only for assigned leads)

-- 15. Quotations: admin/manager full; others only for their assigned leads

-- 16. company_settings & material_pricing: read for all auth, write admin/manager only

-- 17. team_members: admin only manage

-- 18. Bootstrap: make existing admin@chirpeel.com an admin if account exists
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'admin@chirpeel.com' LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role_label, active, permissions)
    VALUES (_uid, 'admin@chirpeel.com', 'Admin', 'Admin', true,
      '{"overview":true,"leads":true,"quotation":true,"messages":true,"finance":true,"settings":true,"branding":true,"team":true}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      permissions = '{"overview":true,"leads":true,"quotation":true,"messages":true,"finance":true,"settings":true,"branding":true,"team":true}'::jsonb,
      role_label = 'Admin', active = true;
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin') ON CONFLICT DO NOTHING;
  END IF;
END $$;


-- ==========================================
-- Migration File: 20260420072128_cce43812-f2ae-4fb7-a34b-a1619d883e46.sql
-- ==========================================

-- 1. Extend quotations table
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

-- 2. Send history table
CREATE TABLE IF NOT EXISTS public.quotation_send_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by text,
  channel text NOT NULL DEFAULT 'whatsapp',
  pdf_url text,
  message_body text,
  note text,
  is_revision boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qsh_quotation_id ON public.quotation_send_history(quotation_id);
CREATE INDEX IF NOT EXISTS idx_qsh_sent_at ON public.quotation_send_history(sent_at DESC);



-- ==========================================
-- Migration File: 20260420122827_7459060d-09a6-400e-acd2-7230d1591138.sql
-- ==========================================

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

CREATE TRIGGER trg_material_room_pricing_updated_at
  BEFORE UPDATE ON public.material_room_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================
-- Migration File: 20260421101738_b4a84954-c6f0-4255-8e02-1b77b7e055cb.sql
-- ==========================================

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

-- ==========================================
-- Migration File: 20260422140818_e354e1f1-c05a-414b-b827-ae3cb736ac9f.sql
-- ==========================================

-- Create brand_catalog table for admin-managed brands across 11 categories
CREATE TABLE public.brand_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  logo_url text,
  rate_per_sqft numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  is_preset boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, key)
);

CREATE INDEX idx_brand_catalog_category_active ON public.brand_catalog (category, active, sort_order);

CREATE TRIGGER trg_brand_catalog_updated_at
  BEFORE UPDATE ON public.brand_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed preset brands (all 11 categories) with rate_per_sqft pulled from material_pricing where it exists.
-- material_pricing scope mapping: hardware -> 'hardware', core_material -> 'core_brand', laminate -> 'laminate',
-- and others use the same scope name as the category.
INSERT INTO public.brand_catalog (category, key, name, logo_url, rate_per_sqft, sort_order, is_preset, active) VALUES
  -- Hardware
  ('hardware', 'ebco', 'Ebco', NULL, 0, 1, true, true),
  ('hardware', 'hettich', 'Hettich', NULL, 0, 2, true, true),
  ('hardware', 'hafele', 'Hafele', NULL, 0, 3, true, true),
  ('hardware', 'blum', 'Blum', NULL, 0, 4, true, true),
  -- Core material
  ('core_material', 'century', 'Century', NULL, 0, 1, true, true),
  ('core_material', 'greenply', 'Greenply', NULL, 0, 2, true, true),
  ('core_material', 'sharon', 'Sharon', NULL, 0, 3, true, true),
  ('core_material', 'chirpeel', 'Chirpeel', NULL, 0, 4, true, true),
  -- Laminate
  ('laminate', 'merino', 'Merino', NULL, 0, 1, true, true),
  ('laminate', 'airolam', 'Airolam', NULL, 0, 2, true, true),
  ('laminate', 'greenlam', 'Greenlam', NULL, 0, 3, true, true),
  ('laminate', 'stylam', 'Stylam', NULL, 0, 4, true, true),
  ('laminate', 'centurylam', 'Century Lam', NULL, 0, 5, true, true),
  -- Acrylic
  ('acrylic', 'praveedh', 'Praveedh', NULL, 0, 1, true, true),
  ('acrylic', 'rehau', 'Rehau', NULL, 0, 2, true, true),
  -- Gypsum
  ('gypsum', 'saint_gobain_gyproc', 'Saint-Gobain Gyproc', NULL, 0, 1, true, true),
  -- Channel
  ('channel', 'jsw', 'JSW', NULL, 0, 1, true, true),
  ('channel', 'gyproc', 'Gyproc', NULL, 0, 2, true, true),
  ('channel', 'import', 'Import', NULL, 0, 3, true, true),
  -- Paint
  ('paint', 'asian_paints', 'Asian Paints', NULL, 0, 1, true, true),
  ('paint', 'nippon', 'Nippon', NULL, 0, 2, true, true),
  ('paint', 'birla_opus', 'Birla Opus', NULL, 0, 3, true, true),
  -- Wiring
  ('wiring', 'havells', 'Havells', NULL, 0, 1, true, true),
  ('wiring', 'polycab', 'Polycab', NULL, 0, 2, true, true),
  ('wiring', 'finolex', 'Finolex', NULL, 0, 3, true, true),
  ('wiring', 'v_guard', 'V-Guard', NULL, 0, 4, true, true),
  -- Switches
  ('switches', 'legrand', 'Legrand', NULL, 0, 1, true, true),
  ('switches', 'anchor', 'Anchor', NULL, 0, 2, true, true),
  ('switches', 'gm', 'GM', NULL, 0, 3, true, true),
  ('switches', 'goldmedal', 'Goldmedal', NULL, 0, 4, true, true)
ON CONFLICT (category, key) DO NOTHING;

-- Sync rate_per_sqft from existing material_pricing rows
-- scope mapping: core_material category <-> 'core_brand' scope; others share name with category
UPDATE public.brand_catalog bc
SET rate_per_sqft = mp.rate_per_sqft
FROM public.material_pricing mp
WHERE bc.key = mp.key
  AND (
    (bc.category = 'core_material' AND mp.scope = 'core_brand')
    OR (bc.category = mp.scope AND bc.category <> 'core_material')
  );

-- ==========================================
-- Migration File: 20260424103635_5c62a495-ae04-48dc-b452-ada8b73ddfdd.sql
-- ==========================================

-- Phase 1: Margin visibility + transactional save RPC

-- 1. Add cost_rate columns for margin tracking
ALTER TABLE public.quotation_room_items
  ADD COLUMN IF NOT EXISTS cost_rate numeric NOT NULL DEFAULT 0;

ALTER TABLE public.pricing_catalog
  ADD COLUMN IF NOT EXISTS cost_rate_per_sqft numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_fixed numeric NOT NULL DEFAULT 0;

ALTER TABLE public.material_pricing
  ADD COLUMN IF NOT EXISTS cost_rate_per_sqft numeric NOT NULL DEFAULT 0;

ALTER TABLE public.material_room_pricing
  ADD COLUMN IF NOT EXISTS cost_rate_per_sqft numeric NOT NULL DEFAULT 0;

-- 2. Transactional save RPC: replaces orphan-prone multi-call save
CREATE OR REPLACE FUNCTION public.save_quotation(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quotation_id uuid;
  v_is_new boolean;
  v_header jsonb := payload->'header';
  v_rooms jsonb := COALESCE(payload->'rooms', '[]'::jsonb);
  v_room jsonb;
  v_room_id uuid;
  v_item jsonb;
  v_creator text;
BEGIN
  v_creator := current_profile_identifier();
  v_quotation_id := NULLIF(v_header->>'id','')::uuid;
  v_is_new := v_quotation_id IS NULL;

  IF v_is_new THEN
    INSERT INTO public.quotations (
      lead_id, customer_name, customer_phone, customer_email, customer_address,
      project_location, project_name, project_type, sales_person,
      quotation_date, validity_days, subtotal, discount_type, discount_value,
      discount_amount, gst_enabled, gst_rate, gst_amount, total_amount,
      template_format, terms_conditions, notes, status, pdf_url,
      hardware_brand, core_material_brand, laminate_brand, brand_selections,
      created_by
    ) VALUES (
      NULLIF(v_header->>'lead_id','')::uuid,
      v_header->>'customer_name',
      v_header->>'customer_phone',
      v_header->>'customer_email',
      v_header->>'customer_address',
      v_header->>'project_location',
      v_header->>'project_name',
      v_header->>'project_type',
      v_header->>'sales_person',
      COALESCE((v_header->>'quotation_date')::date, CURRENT_DATE),
      COALESCE((v_header->>'validity_days')::int, 15),
      COALESCE((v_header->>'subtotal')::numeric, 0),
      COALESCE(v_header->>'discount_type','percent'),
      COALESCE((v_header->>'discount_value')::numeric, 0),
      COALESCE((v_header->>'discount_amount')::numeric, 0),
      COALESCE((v_header->>'gst_enabled')::boolean, true),
      COALESCE((v_header->>'gst_rate')::numeric, 18),
      COALESCE((v_header->>'gst_amount')::numeric, 0),
      COALESCE((v_header->>'total_amount')::numeric, 0),
      COALESCE(v_header->>'template_format','detailed'),
      v_header->>'terms_conditions',
      v_header->>'notes',
      COALESCE(v_header->>'status','draft'),
      v_header->>'pdf_url',
      v_header->>'hardware_brand',
      v_header->>'core_material_brand',
      v_header->>'laminate_brand',
      COALESCE(v_header->'brand_selections','{}'::jsonb),
      v_creator
    )
    RETURNING id INTO v_quotation_id;
  ELSE
    UPDATE public.quotations SET
      lead_id = NULLIF(v_header->>'lead_id','')::uuid,
      customer_name = v_header->>'customer_name',
      customer_phone = v_header->>'customer_phone',
      customer_email = v_header->>'customer_email',
      customer_address = v_header->>'customer_address',
      project_location = v_header->>'project_location',
      project_name = v_header->>'project_name',
      project_type = v_header->>'project_type',
      sales_person = v_header->>'sales_person',
      quotation_date = COALESCE((v_header->>'quotation_date')::date, CURRENT_DATE),
      validity_days = COALESCE((v_header->>'validity_days')::int, 15),
      subtotal = COALESCE((v_header->>'subtotal')::numeric, 0),
      discount_type = COALESCE(v_header->>'discount_type','percent'),
      discount_value = COALESCE((v_header->>'discount_value')::numeric, 0),
      discount_amount = COALESCE((v_header->>'discount_amount')::numeric, 0),
      gst_enabled = COALESCE((v_header->>'gst_enabled')::boolean, true),
      gst_rate = COALESCE((v_header->>'gst_rate')::numeric, 18),
      gst_amount = COALESCE((v_header->>'gst_amount')::numeric, 0),
      total_amount = COALESCE((v_header->>'total_amount')::numeric, 0),
      template_format = COALESCE(v_header->>'template_format','detailed'),
      terms_conditions = v_header->>'terms_conditions',
      notes = v_header->>'notes',
      status = COALESCE(v_header->>'status','draft'),
      pdf_url = v_header->>'pdf_url',
      hardware_brand = v_header->>'hardware_brand',
      core_material_brand = v_header->>'core_material_brand',
      laminate_brand = v_header->>'laminate_brand',
      brand_selections = COALESCE(v_header->'brand_selections','{}'::jsonb),
      updated_at = now()
    WHERE id = v_quotation_id;
  END IF;

  -- Replace rooms+items atomically
  DELETE FROM public.quotation_room_items
    WHERE quotation_room_id IN (SELECT id FROM public.quotation_rooms WHERE quotation_id = v_quotation_id);
  DELETE FROM public.quotation_rooms WHERE quotation_id = v_quotation_id;

  FOR v_room IN SELECT * FROM jsonb_array_elements(v_rooms) LOOP
    INSERT INTO public.quotation_rooms (
      quotation_id, room_name, room_type, material_type_key,
      width_ft, height_ft, depth_ft, area_sqft, quantity,
      material_id, material_name, material_rate,
      hardware_id, hardware_name, hardware_rate, hardware_fixed,
      core_material_id, core_material_name, core_material_rate,
      shutter_finish, custom_cost, notes, total_cost, sort_order
    ) VALUES (
      v_quotation_id,
      v_room->>'room_name',
      v_room->>'room_type',
      v_room->>'material_type_key',
      COALESCE((v_room->>'width_ft')::numeric, 0),
      COALESCE((v_room->>'height_ft')::numeric, 0),
      NULLIF(v_room->>'depth_ft','')::numeric,
      COALESCE((v_room->>'area_sqft')::numeric, 0),
      COALESCE((v_room->>'quantity')::numeric, 1),
      NULLIF(v_room->>'material_id','')::uuid,
      v_room->>'material_name',
      COALESCE((v_room->>'material_rate')::numeric, 0),
      NULLIF(v_room->>'hardware_id','')::uuid,
      v_room->>'hardware_name',
      COALESCE((v_room->>'hardware_rate')::numeric, 0),
      COALESCE((v_room->>'hardware_fixed')::numeric, 0),
      NULLIF(v_room->>'core_material_id','')::uuid,
      v_room->>'core_material_name',
      COALESCE((v_room->>'core_material_rate')::numeric, 0),
      v_room->>'shutter_finish',
      COALESCE((v_room->>'custom_cost')::numeric, 0),
      v_room->>'notes',
      COALESCE((v_room->>'total_cost')::numeric, 0),
      COALESCE((v_room->>'sort_order')::int, 0)
    )
    RETURNING id INTO v_room_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_room->'line_items','[]'::jsonb)) LOOP
      INSERT INTO public.quotation_room_items (
        quotation_room_id, catalog_id, item_name, item_category, item_type,
        width_ft, height_ft, area_sqft, quantity, rate, cost_rate,
        pricing_mode, total_cost, notes, sort_order
      ) VALUES (
        v_room_id,
        NULLIF(v_item->>'catalog_id','')::uuid,
        v_item->>'item_name',
        v_item->>'item_category',
        v_item->>'item_type',
        COALESCE((v_item->>'width_ft')::numeric, 0),
        COALESCE((v_item->>'height_ft')::numeric, 0),
        COALESCE((v_item->>'area_sqft')::numeric, 0),
        COALESCE((v_item->>'quantity')::numeric, 1),
        COALESCE((v_item->>'rate')::numeric, 0),
        COALESCE((v_item->>'cost_rate')::numeric, 0),
        COALESCE(v_item->>'pricing_mode','sqft'),
        COALESCE((v_item->>'total_cost')::numeric, 0),
        v_item->>'notes',
        COALESCE((v_item->>'sort_order')::int, 0)
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('id', v_quotation_id, 'is_new', v_is_new);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_quotation(jsonb) TO authenticated;

-- ==========================================
-- Migration File: 20260425083158_ff754aa2-fd3b-4e2b-96bb-5c5bd885a709.sql
-- ==========================================

CREATE OR REPLACE FUNCTION public.clone_quotation(_source_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_id uuid;
  v_creator text;
  v_old_room_id uuid;
  v_new_room_id uuid;
BEGIN
  v_creator := current_profile_identifier();

  INSERT INTO public.quotations (
    lead_id, customer_name, customer_phone, customer_email, customer_address,
    project_location, project_name, project_type, sales_person,
    quotation_date, validity_days, subtotal, discount_type, discount_value,
    discount_amount, gst_enabled, gst_rate, gst_amount, total_amount,
    template_format, terms_conditions, notes, status, pdf_url,
    hardware_brand, core_material_brand, laminate_brand, brand_selections,
    created_by
  )
  SELECT
    NULL, customer_name, customer_phone, customer_email, customer_address,
    project_location,
    COALESCE(project_name,'') || ' (Copy)',
    project_type, sales_person,
    CURRENT_DATE, validity_days, subtotal, discount_type, discount_value,
    discount_amount, gst_enabled, gst_rate, gst_amount, total_amount,
    template_format, terms_conditions, notes, 'draft', NULL,
    hardware_brand, core_material_brand, laminate_brand, brand_selections,
    v_creator
  FROM public.quotations
  WHERE id = _source_id
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    RAISE EXCEPTION 'Source quotation not found: %', _source_id;
  END IF;

  -- Clone rooms one-by-one so we can also clone their child line items
  FOR v_old_room_id IN
    SELECT id FROM public.quotation_rooms WHERE quotation_id = _source_id ORDER BY sort_order, created_at
  LOOP
    INSERT INTO public.quotation_rooms (
      quotation_id, room_name, room_type, material_type_key,
      width_ft, height_ft, depth_ft, area_sqft, quantity,
      material_id, material_name, material_rate,
      hardware_id, hardware_name, hardware_rate, hardware_fixed,
      core_material_id, core_material_name, core_material_rate,
      shutter_finish, custom_cost, notes, total_cost, sort_order
    )
    SELECT
      v_new_id, room_name, room_type, material_type_key,
      width_ft, height_ft, depth_ft, area_sqft, quantity,
      material_id, material_name, material_rate,
      hardware_id, hardware_name, hardware_rate, hardware_fixed,
      core_material_id, core_material_name, core_material_rate,
      shutter_finish, custom_cost, notes, total_cost, sort_order
    FROM public.quotation_rooms
    WHERE id = v_old_room_id
    RETURNING id INTO v_new_room_id;

    INSERT INTO public.quotation_room_items (
      quotation_room_id, catalog_id, item_name, item_category, item_type,
      width_ft, height_ft, area_sqft, quantity, rate, cost_rate,
      pricing_mode, total_cost, notes, sort_order
    )
    SELECT
      v_new_room_id, catalog_id, item_name, item_category, item_type,
      width_ft, height_ft, area_sqft, quantity, rate, cost_rate,
      pricing_mode, total_cost, notes, sort_order
    FROM public.quotation_room_items
    WHERE quotation_room_id = v_old_room_id;
  END LOOP;

  RETURN v_new_id;
END;
$$;

-- ==========================================
-- Migration File: 20260425110518_1035cd54-2fd9-4541-8122-d47a41e480c2.sql
-- ==========================================

-- ============ FINANCE MODULE ============

-- Helper: check finance permission
CREATE OR REPLACE FUNCTION public.has_finance_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin_or_manager(_user_id)
      OR has_permission(_user_id, 'finance')
$$;

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  invoice_id uuid,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'upi',  -- upi, cheque, cash, bank, card, other
  reference text,
  milestone text,                    -- '10','50','40','custom'
  receipt_url text,
  notes text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_quotation ON public.payments(quotation_id);
CREATE INDEX idx_payments_lead ON public.payments(lead_id);
CREATE INDEX idx_payments_paid_on ON public.payments(paid_on DESC);

CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ INVOICE NUMBERING (FY based: Apr-Mar) ============
CREATE TABLE public.invoice_fy_seq (
  fy_start int PRIMARY KEY,   -- e.g. 2026 means FY 2026-27 (Apr 2026 - Mar 2027)
  last_seq int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_fy int;
  v_seq int;
BEGIN
  -- Indian FY: April to March
  IF EXTRACT(MONTH FROM v_today) >= 4 THEN
    v_fy := EXTRACT(YEAR FROM v_today)::int;
  ELSE
    v_fy := EXTRACT(YEAR FROM v_today)::int - 1;
  END IF;

  INSERT INTO public.invoice_fy_seq(fy_start, last_seq) VALUES (v_fy, 1)
    ON CONFLICT (fy_start) DO UPDATE SET last_seq = invoice_fy_seq.last_seq + 1, updated_at = now()
    RETURNING last_seq INTO v_seq;

  RETURN 'HC-INV-' || v_fy::text || '-' || LPAD(v_seq::text, 4, '0');
END;
$$;

-- ============ INVOICES ============
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_address text,
  milestone text,                       -- '10','50','40','custom'
  milestone_label text,                 -- 'Booking 10%', etc.
  amount numeric NOT NULL DEFAULT 0,
  gst_enabled boolean NOT NULL DEFAULT true,
  gst_rate numeric NOT NULL DEFAULT 18,
  gst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  status text NOT NULL DEFAULT 'draft', -- draft, issued, paid, overdue, cancelled
  paid_amount numeric NOT NULL DEFAULT 0,
  paid_on date,
  pdf_url text,
  notes text,
  last_reminder_at timestamptz,
  reminder_count int NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_quotation ON public.invoices(quotation_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-assign invoice number on insert if blank
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.next_invoice_number();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_invoices_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

-- ============ EXPENSES ============
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'material',  -- material, labour, transport, overhead, other
  vendor text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  payment_mode text DEFAULT 'cash',
  reference text,
  receipt_url text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_quotation ON public.expenses(quotation_id);
CREATE INDEX idx_expenses_lead ON public.expenses(lead_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses(category);

CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REMINDER LOG ============
CREATE TABLE public.finance_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  channel text NOT NULL,         -- email, whatsapp
  sent_to text,
  status text NOT NULL,          -- sent, failed, queued
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('finance-receipts', 'finance-receipts', false)
  ON CONFLICT (id) DO NOTHING;

-- ============ HELPER VIEW: Outstanding per invoice ============
CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  UPDATE public.invoices
    SET status = 'overdue'
    WHERE status = 'issued'
      AND due_date < CURRENT_DATE
      AND paid_amount < total_amount;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

-- ==========================================
-- Migration File: 20260425132913_1da4f35d-49aa-4dce-9d38-e158df18ab2c.sql
-- ==========================================


-- ============ 1. Workflow columns on quotations ============
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS negotiation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_note text;

ALTER TABLE public.quotations
  DROP CONSTRAINT IF EXISTS quotations_workflow_status_check;
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_workflow_status_check
  CHECK (workflow_status IN ('draft','internal_review','sent','negotiation','approved','rejected'));

-- ============ 2. quotation_versions ============
CREATE TABLE IF NOT EXISTS public.quotation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL,
  version_number int NOT NULL,
  label text,
  trigger text NOT NULL DEFAULT 'manual',
  snapshot jsonb NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  UNIQUE (quotation_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_qid ON public.quotation_versions(quotation_id);

-- ============ 3. quotation_workflow_log ============
CREATE TABLE IF NOT EXISTS public.quotation_workflow_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  actor text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_workflow_log_qid ON public.quotation_workflow_log(quotation_id);

-- ============ 4. snapshot_quotation RPC ============
CREATE OR REPLACE FUNCTION public.snapshot_quotation(
  _quotation_id uuid,
  _label text DEFAULT NULL,
  _trigger text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version int;
  v_snapshot jsonb;
  v_total numeric;
  v_creator text;
  v_id uuid;
BEGIN
  v_creator := current_profile_identifier();

  SELECT COALESCE(MAX(version_number),0)+1 INTO v_version
    FROM public.quotation_versions WHERE quotation_id = _quotation_id;

  SELECT total_amount INTO v_total FROM public.quotations WHERE id = _quotation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation % not found', _quotation_id; END IF;

  SELECT jsonb_build_object(
    'header', to_jsonb(q.*),
    'rooms', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(r.*) || jsonb_build_object(
          'line_items', COALESCE((
            SELECT jsonb_agg(to_jsonb(i.*) ORDER BY i.sort_order, i.created_at)
            FROM public.quotation_room_items i WHERE i.quotation_room_id = r.id
          ), '[]'::jsonb)
        )
        ORDER BY r.sort_order, r.created_at
      )
      FROM public.quotation_rooms r WHERE r.quotation_id = q.id
    ), '[]'::jsonb)
  ) INTO v_snapshot
  FROM public.quotations q WHERE q.id = _quotation_id;

  INSERT INTO public.quotation_versions (
    quotation_id, version_number, label, trigger, snapshot, total_amount, created_by
  ) VALUES (
    _quotation_id, v_version, _label, COALESCE(_trigger,'manual'), v_snapshot, COALESCE(v_total,0), v_creator
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'version_number', v_version);
END; $$;

-- ============ 5. transition_quotation_workflow RPC ============
CREATE OR REPLACE FUNCTION public.transition_quotation_workflow(
  _quotation_id uuid,
  _to text,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current text;
  v_creator text;
  v_actor text;
  v_is_mgr boolean;
  v_is_creator boolean;
  v_legacy text;
  v_lead_assignee text;
  v_lead_id uuid;
BEGIN
  v_actor := current_profile_identifier();
  v_is_mgr := is_admin_or_manager(auth.uid());

  SELECT workflow_status, created_by, lead_id INTO v_current, v_creator, v_lead_id
    FROM public.quotations WHERE id = _quotation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found'; END IF;

  IF v_lead_id IS NOT NULL THEN
    SELECT assigned_to INTO v_lead_assignee FROM public.leads WHERE id = v_lead_id;
  END IF;

  v_is_creator := (v_creator = v_actor) OR (v_lead_assignee IS NOT NULL AND v_lead_assignee = v_actor);

  -- Validate transitions and permissions
  IF v_current = 'draft' AND _to = 'internal_review' THEN
    IF NOT (v_is_creator OR v_is_mgr) THEN RAISE EXCEPTION 'Not permitted'; END IF;
    UPDATE public.quotations SET workflow_status = _to, submitted_for_review_at = now(), updated_at = now()
      WHERE id = _quotation_id;
  ELSIF v_current = 'internal_review' AND _to IN ('approved','rejected') THEN
    IF NOT v_is_mgr THEN RAISE EXCEPTION 'Only admin/manager can approve or reject'; END IF;
    v_legacy := _to;
    UPDATE public.quotations SET workflow_status = _to, status = v_legacy,
      reviewed_at = now(), reviewed_by = v_actor, decided_at = now(), decision_note = _note, updated_at = now()
      WHERE id = _quotation_id;
  ELSIF v_current = 'approved' AND _to = 'sent' THEN
    IF NOT (v_is_creator OR v_is_mgr) THEN RAISE EXCEPTION 'Not permitted'; END IF;
    UPDATE public.quotations SET workflow_status = _to, status = 'sent', sent_at = now(), updated_at = now()
      WHERE id = _quotation_id;
  ELSIF v_current = 'sent' AND _to = 'negotiation' THEN
    IF NOT (v_is_creator OR v_is_mgr) THEN RAISE EXCEPTION 'Not permitted'; END IF;
    UPDATE public.quotations SET workflow_status = _to, negotiation_started_at = now(), updated_at = now()
      WHERE id = _quotation_id;
  ELSIF v_current = 'negotiation' AND _to IN ('approved','rejected') THEN
    IF NOT v_is_mgr THEN RAISE EXCEPTION 'Only admin/manager can approve or reject'; END IF;
    v_legacy := _to;
    UPDATE public.quotations SET workflow_status = _to, status = v_legacy,
      reviewed_at = now(), reviewed_by = v_actor, decided_at = now(), decision_note = _note, updated_at = now()
      WHERE id = _quotation_id;
  ELSIF v_current = 'rejected' AND _to = 'draft' THEN
    IF NOT v_is_mgr THEN RAISE EXCEPTION 'Only admin/manager can reopen'; END IF;
    UPDATE public.quotations SET workflow_status = _to, status = 'draft', updated_at = now()
      WHERE id = _quotation_id;
  ELSE
    RAISE EXCEPTION 'Illegal transition % -> %', v_current, _to;
  END IF;

  INSERT INTO public.quotation_workflow_log (quotation_id, from_status, to_status, actor, note)
    VALUES (_quotation_id, v_current, _to, v_actor, _note);

  RETURN jsonb_build_object('from', v_current, 'to', _to);
END; $$;


-- ==========================================
-- Migration File: 20260425134723_92d8a6cd-a64a-4c7e-95ad-2428ec4512b9.sql
-- ==========================================

-- ============================================================
-- A. ACTIVITY LOG + audit triggers
-- ============================================================
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text,
  action text NOT NULL,             -- insert | update | delete
  entity_type text NOT NULL,        -- lead | quotation | invoice | payment | expense
  entity_id uuid,
  summary text,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_log_created_at ON public.activity_log (created_at DESC);
CREATE INDEX idx_activity_log_entity ON public.activity_log (entity_type, entity_id);
CREATE INDEX idx_activity_log_actor ON public.activity_log (actor);

-- No insert/update/delete policies = nobody can write directly; only SECURITY DEFINER triggers can.

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text;
  v_entity text := TG_ARGV[0];
  v_summary text;
  v_diff jsonb := '{}'::jsonb;
  v_id uuid;
  k text;
  old_val jsonb;
  new_val jsonb;
BEGIN
  v_actor := current_profile_identifier();

  IF TG_OP = 'DELETE' THEN
    v_id := (to_jsonb(OLD)->>'id')::uuid;
    v_summary := 'Deleted ' || v_entity;
    v_diff := jsonb_build_object('before', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    v_id := (to_jsonb(NEW)->>'id')::uuid;
    v_summary := 'Created ' || v_entity;
    v_diff := jsonb_build_object('after', to_jsonb(NEW));
  ELSE
    v_id := (to_jsonb(NEW)->>'id')::uuid;
    -- Compute changed columns only
    FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      old_val := to_jsonb(OLD)->k;
      new_val := to_jsonb(NEW)->k;
      IF old_val IS DISTINCT FROM new_val AND k NOT IN ('updated_at') THEN
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('from', old_val, 'to', new_val));
      END IF;
    END LOOP;
    IF v_diff = '{}'::jsonb THEN
      RETURN NEW;  -- nothing meaningful changed
    END IF;
    v_summary := 'Updated ' || v_entity;
    -- Friendlier summary for status/stage changes
    IF v_diff ? 'status' THEN
      v_summary := v_summary || ': status ' || COALESCE(v_diff->'status'->>'from','—') || ' → ' || COALESCE(v_diff->'status'->>'to','—');
    ELSIF v_diff ? 'stage' THEN
      v_summary := v_summary || ': stage ' || COALESCE(v_diff->'stage'->>'from','—') || ' → ' || COALESCE(v_diff->'stage'->>'to','—');
    ELSIF v_diff ? 'workflow_status' THEN
      v_summary := v_summary || ': workflow ' || COALESCE(v_diff->'workflow_status'->>'from','—') || ' → ' || COALESCE(v_diff->'workflow_status'->>'to','—');
    END IF;
  END IF;

  INSERT INTO public.activity_log (actor, action, entity_type, entity_id, summary, diff)
    VALUES (v_actor, lower(TG_OP), v_entity, v_id, v_summary, v_diff);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_leads
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('lead');
CREATE TRIGGER trg_audit_quotations
  AFTER INSERT OR UPDATE OR DELETE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('quotation');
CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('invoice');
CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('payment');
CREATE TRIGGER trg_audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('expense');

-- ============================================================
-- B. TASKS
-- ============================================================
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to text,
  created_by text,
  lead_id uuid,
  quotation_id uuid,
  priority text NOT NULL DEFAULT 'normal',  -- low | normal | high
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_assignee_open ON public.tasks (assigned_to) WHERE completed_at IS NULL;
CREATE INDEX idx_tasks_lead ON public.tasks (lead_id);
CREATE INDEX idx_tasks_due ON public.tasks (due_at);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- C. CLIENT SHARE LINKS (public portal)
-- ============================================================
CREATE TABLE public.client_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_share_links_lead ON public.client_share_links (lead_id);

-- ============================================================
-- D. PROJECT STAGE PHOTOS
-- ============================================================
CREATE TABLE public.project_stage_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  stage text NOT NULL,            -- factory | site | installation | handover
  photo_url text NOT NULL,
  caption text,
  uploaded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stage_photos_lead ON public.project_stage_photos (lead_id, stage);

-- ============================================================
-- E. APP SETTINGS (singleton)
-- ============================================================
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_gst_rate numeric NOT NULL DEFAULT 18,
  default_validity_days integer NOT NULL DEFAULT 15,
  default_terms text,
  profit_margin_alert_pct numeric NOT NULL DEFAULT 25,
  monthly_lead_target integer NOT NULL DEFAULT 50,
  monthly_revenue_target numeric NOT NULL DEFAULT 1000000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- G. PROFILE EXTENSIONS
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tz text NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS working_hours jsonb NOT NULL DEFAULT '{"start":"09:00","end":"19:00","days":[1,2,3,4,5,6]}'::jsonb,
  ADD COLUMN IF NOT EXISTS digest_opt_in boolean NOT NULL DEFAULT true;

-- ============================================================
-- H. SOFT DELETE COLUMNS
-- ============================================================
ALTER TABLE public.leads      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.invoices   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.payments   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.expenses   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_not_deleted      ON public.leads      (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_not_deleted ON public.quotations (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_not_deleted   ON public.invoices   (created_at DESC) WHERE deleted_at IS NULL;

-- Helper: soft-delete + restore RPCs (admin/manager only)
CREATE OR REPLACE FUNCTION public.soft_delete_entity(_entity text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;
  IF _entity = 'lead' THEN
    UPDATE public.leads SET deleted_at = now() WHERE id = _id;
  ELSIF _entity = 'quotation' THEN
    UPDATE public.quotations SET deleted_at = now() WHERE id = _id;
  ELSIF _entity = 'invoice' THEN
    UPDATE public.invoices SET deleted_at = now() WHERE id = _id;
  ELSIF _entity = 'payment' THEN
    UPDATE public.payments SET deleted_at = now() WHERE id = _id;
  ELSIF _entity = 'expense' THEN
    UPDATE public.expenses SET deleted_at = now() WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'Unknown entity %', _entity;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.restore_entity(_entity text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;
  IF _entity = 'lead' THEN
    UPDATE public.leads SET deleted_at = NULL WHERE id = _id;
  ELSIF _entity = 'quotation' THEN
    UPDATE public.quotations SET deleted_at = NULL WHERE id = _id;
  ELSIF _entity = 'invoice' THEN
    UPDATE public.invoices SET deleted_at = NULL WHERE id = _id;
  ELSIF _entity = 'payment' THEN
    UPDATE public.payments SET deleted_at = NULL WHERE id = _id;
  ELSIF _entity = 'expense' THEN
    UPDATE public.expenses SET deleted_at = NULL WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'Unknown entity %', _entity;
  END IF;
END; $$;

-- ============================================================
-- I. CLIENT PORTAL public RPC (no auth required, security definer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_client_portal_data(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_link_id uuid;
  v_data jsonb;
BEGIN
  SELECT id, lead_id INTO v_link_id, v_lead_id
    FROM public.client_share_links
    WHERE token = _token
      AND revoked = false
      AND (expires_at IS NULL OR expires_at > now());
  IF v_lead_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.client_share_links
    SET view_count = view_count + 1, last_viewed_at = now()
    WHERE id = v_link_id;

  SELECT jsonb_build_object(
    'lead', (
      SELECT jsonb_build_object(
        'name', l.name,
        'project_type', l.project_type,
        'city', l.city,
        'stage', l.stage,
        'created_at', l.created_at
      ) FROM public.leads l WHERE l.id = v_lead_id AND l.deleted_at IS NULL
    ),
    'quotation', (
      SELECT jsonb_build_object(
        'quotation_number', q.quotation_number,
        'project_name', q.project_name,
        'subtotal', q.subtotal,
        'discount_amount', q.discount_amount,
        'gst_amount', q.gst_amount,
        'total_amount', q.total_amount,
        'sent_at', q.sent_at,
        'pdf_url', q.pdf_url
      ) FROM public.quotations q
        WHERE q.lead_id = v_lead_id AND q.deleted_at IS NULL
        ORDER BY q.created_at DESC LIMIT 1
    ),
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'paid_on', p.paid_on, 'amount', p.amount, 'milestone', p.milestone, 'mode', p.mode
      ) ORDER BY p.paid_on DESC)
      FROM public.payments p
      WHERE p.lead_id = v_lead_id AND p.deleted_at IS NULL
    ), '[]'::jsonb),
    'invoices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'invoice_number', i.invoice_number, 'issue_date', i.issue_date,
        'due_date', i.due_date, 'total_amount', i.total_amount,
        'paid_amount', i.paid_amount, 'status', i.status, 'pdf_url', i.pdf_url
      ) ORDER BY i.issue_date DESC)
      FROM public.invoices i
      WHERE i.lead_id = v_lead_id AND i.deleted_at IS NULL
    ), '[]'::jsonb),
    'photos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'stage', sp.stage, 'photo_url', sp.photo_url,
        'caption', sp.caption, 'created_at', sp.created_at
      ) ORDER BY sp.created_at DESC)
      FROM public.project_stage_photos sp
      WHERE sp.lead_id = v_lead_id
    ), '[]'::jsonb),
    'files', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'file_name', f.file_name, 'file_url', f.file_url,
        'file_type', f.file_type, 'created_at', f.created_at
      ) ORDER BY f.created_at DESC)
      FROM public.project_files f
      WHERE f.lead_id = v_lead_id
    ), '[]'::jsonb),
    'company', (
      SELECT jsonb_build_object(
        'name', c.company_name, 'tagline', c.tagline,
        'phone', c.phone, 'email', c.email, 'website', c.website,
        'logo_url', c.logo_url, 'accent_color', c.accent_color
      ) FROM public.company_settings c LIMIT 1
    )
  ) INTO v_data;

  RETURN v_data;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_client_portal_data(text) TO anon, authenticated;

-- ==========================================
-- Migration File: 20260425135539_e489ba64-08b3-4b7c-b0d8-026c078012b5.sql
-- ==========================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS google_calendar_id text,
  ADD COLUMN IF NOT EXISTS calendar_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS calendar_html_link text;

CREATE INDEX IF NOT EXISTS idx_tasks_google_event ON public.tasks (google_event_id) WHERE google_event_id IS NOT NULL;

-- ==========================================
-- Migration File: 20260425135922_1bc69e61-4653-423f-bbf9-063aac444c54.sql
-- ==========================================

-- =========================================================
-- message_templates
-- =========================================================

-- =========================================================
-- pricing_catalog
-- =========================================================

-- "Anyone authenticated can read pricing" SELECT policy stays in place.

-- =========================================================
-- project_files (scoped to the parent lead's access rules)
-- =========================================================

-- =========================================================
-- quotation_rooms (scope to parent quotation editability)
-- =========================================================

-- =========================================================
-- quotation_room_items (scope through parent room -> quotation)
-- =========================================================

-- =========================================================
-- quotation_send_history (scope inserts the same way as views)
-- =========================================================

CREATE POLICY "Insert send history (scoped)"
  ON public.quotation_send_history FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quotations q
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE q.id = quotation_send_history.quotation_id
        AND (
          q.created_by = current_profile_identifier()
          OR l.assigned_to = current_profile_identifier()
        )
    )
  );

-- ==========================================
-- Migration File: 20260425140259_2427d5f9-80c6-4b55-99bc-d2e0b3f126e4.sql
-- ==========================================

-- Floorplans: drop broad public SELECT, allow only authenticated listing.

-- Project files: drop public SELECT, allow only authenticated listing.

-- Quotations: drop public SELECT, allow only authenticated listing.



-- ==========================================
-- Migration File: 20260425140339_1337a31d-c8da-4f70-98ca-28cabcd269fe.sql
-- ==========================================

-- Replace broad authenticated SELECT with admin/manager-scoped listing.



-- ==========================================
-- Migration File: 20260425141355_d35c18b9-d16b-406b-b98a-c0c921712a80.sql
-- ==========================================

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS overdue_threshold_days integer NOT NULL DEFAULT 1;

-- ==========================================
-- Migration File: 20260425142031_2351f2c7-9493-4974-9b14-963665e0a18c.sql
-- ==========================================


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

CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON public.project_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_materials_project ON public.project_materials(project_id);

-- ============ TASKS: link to projects ============
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_id uuid;
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);

-- ============ Default permission keys (extend profiles) ============
-- Existing profiles already use a jsonb permissions field; new keys default to false at app layer.


-- ==========================================
-- Migration File: 20260426025640_703963b1-26ca-438e-a5e2-b34804684dbf.sql
-- ==========================================

CREATE TABLE public.recurring_invoice_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id uuid,
  lead_id uuid,
  milestone text,
  milestone_label text,
  amount numeric NOT NULL DEFAULT 0,
  gst_enabled boolean NOT NULL DEFAULT true,
  gst_rate numeric NOT NULL DEFAULT 18,
  frequency text NOT NULL DEFAULT 'monthly',
  next_run_date date NOT NULL DEFAULT CURRENT_DATE,
  last_generated_at timestamp with time zone,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_recurring_invoice_templates
  BEFORE UPDATE ON public.recurring_invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER log_activity_recurring_invoice_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.recurring_invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('recurring_invoice');

CREATE INDEX idx_recurring_templates_next_run ON public.recurring_invoice_templates (next_run_date) WHERE active = true;
CREATE INDEX idx_recurring_templates_quotation ON public.recurring_invoice_templates (quotation_id);

-- ==========================================
-- Migration File: 20260426034055_b7b7e35a-8cfd-4b18-96bd-af4e06e4be77.sql
-- ==========================================

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS client_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_link_url text,
  ADD COLUMN IF NOT EXISTS payment_link_id text,
  ADD COLUMN IF NOT EXISTS auto_project_id uuid;

CREATE INDEX IF NOT EXISTS idx_quotations_auto_project_id ON public.quotations(auto_project_id);

-- ==========================================
-- Migration File: 20260426040434_569829d6-5084-4c24-a27f-d46a3c261f41.sql
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_client_portal_data(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id uuid;
  v_link_id uuid;
  v_data jsonb;
BEGIN
  SELECT id, lead_id INTO v_link_id, v_lead_id
    FROM public.client_share_links
    WHERE token = _token
      AND revoked = false
      AND (expires_at IS NULL OR expires_at > now());
  IF v_lead_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.client_share_links
    SET view_count = view_count + 1, last_viewed_at = now()
    WHERE id = v_link_id;

  SELECT jsonb_build_object(
    'lead', (
      SELECT jsonb_build_object(
        'name', l.name,
        'project_type', l.project_type,
        'city', l.city,
        'stage', l.stage,
        'created_at', l.created_at
      ) FROM public.leads l WHERE l.id = v_lead_id AND l.deleted_at IS NULL
    ),
    'quotation', (
      SELECT jsonb_build_object(
        'quotation_number', q.quotation_number,
        'project_name', q.project_name,
        'subtotal', q.subtotal,
        'discount_amount', q.discount_amount,
        'gst_amount', q.gst_amount,
        'total_amount', q.total_amount,
        'sent_at', q.sent_at,
        'pdf_url', q.pdf_url,
        'status', q.status,
        'workflow_status', q.workflow_status,
        'client_approved_at', q.client_approved_at,
        'payment_link_url', q.payment_link_url,
        'auto_project_id', q.auto_project_id
      ) FROM public.quotations q
        WHERE q.lead_id = v_lead_id AND q.deleted_at IS NULL
        ORDER BY q.created_at DESC LIMIT 1
    ),
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'paid_on', p.paid_on, 'amount', p.amount, 'milestone', p.milestone, 'mode', p.mode
      ) ORDER BY p.paid_on DESC)
      FROM public.payments p
      WHERE p.lead_id = v_lead_id AND p.deleted_at IS NULL
    ), '[]'::jsonb),
    'invoices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'invoice_number', i.invoice_number, 'issue_date', i.issue_date,
        'due_date', i.due_date, 'total_amount', i.total_amount,
        'paid_amount', i.paid_amount, 'status', i.status, 'pdf_url', i.pdf_url
      ) ORDER BY i.issue_date DESC)
      FROM public.invoices i
      WHERE i.lead_id = v_lead_id AND i.deleted_at IS NULL
    ), '[]'::jsonb),
    'photos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'stage', sp.stage, 'photo_url', sp.photo_url,
        'caption', sp.caption, 'created_at', sp.created_at
      ) ORDER BY sp.created_at DESC)
      FROM public.project_stage_photos sp
      WHERE sp.lead_id = v_lead_id
    ), '[]'::jsonb),
    'files', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'file_name', f.file_name, 'file_url', f.file_url,
        'file_type', f.file_type, 'created_at', f.created_at
      ) ORDER BY f.created_at DESC)
      FROM public.project_files f
      WHERE f.lead_id = v_lead_id
    ), '[]'::jsonb),
    'company', (
      SELECT jsonb_build_object(
        'name', c.company_name, 'tagline', c.tagline,
        'phone', c.phone, 'email', c.email, 'website', c.website,
        'logo_url', c.logo_url, 'accent_color', c.accent_color
      ) FROM public.company_settings c LIMIT 1
    )
  ) INTO v_data;

  RETURN v_data;
END; $function$;

-- ==========================================
-- Migration File: 20260426040810_e0dc864b-ae5b-4c17-8902-d4067f97ede6.sql
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_client_portal_data(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id uuid;
  v_link_id uuid;
  v_data jsonb;
BEGIN
  SELECT id, lead_id INTO v_link_id, v_lead_id
    FROM public.client_share_links
    WHERE token = _token
      AND revoked = false
      AND (expires_at IS NULL OR expires_at > now());
  IF v_lead_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.client_share_links
    SET view_count = view_count + 1, last_viewed_at = now()
    WHERE id = v_link_id;

  SELECT jsonb_build_object(
    'lead', (
      SELECT jsonb_build_object(
        'name', l.name,
        'project_type', l.project_type,
        'city', l.city,
        'stage', l.stage,
        'created_at', l.created_at
      ) FROM public.leads l WHERE l.id = v_lead_id AND l.deleted_at IS NULL
    ),
    'quotation', (
      SELECT jsonb_build_object(
        'quotation_number', q.quotation_number,
        'project_name', q.project_name,
        'subtotal', q.subtotal,
        'discount_amount', q.discount_amount,
        'gst_amount', q.gst_amount,
        'total_amount', q.total_amount,
        'sent_at', q.sent_at,
        'pdf_url', q.pdf_url,
        'status', q.status,
        'workflow_status', q.workflow_status,
        'client_approved_at', q.client_approved_at,
        'payment_link_url', q.payment_link_url,
        'auto_project_id', q.auto_project_id
      ) FROM public.quotations q
        WHERE q.lead_id = v_lead_id AND q.deleted_at IS NULL
        ORDER BY q.created_at DESC LIMIT 1
    ),
    'project', (
      SELECT jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'status', p.status,
        'progress_pct', p.progress_pct,
        'start_date', p.start_date,
        'target_end_date', p.target_end_date,
        'milestones', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'title', m.title,
            'target_date', m.target_date,
            'completed_at', m.completed_at,
            'sort_order', m.sort_order
          ) ORDER BY m.sort_order)
          FROM public.project_milestones m WHERE m.project_id = p.id
        ), '[]'::jsonb)
      )
      FROM public.projects p
      WHERE p.lead_id = v_lead_id AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC LIMIT 1
    ),
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'paid_on', p.paid_on, 'amount', p.amount, 'milestone', p.milestone, 'mode', p.mode
      ) ORDER BY p.paid_on DESC)
      FROM public.payments p
      WHERE p.lead_id = v_lead_id AND p.deleted_at IS NULL
    ), '[]'::jsonb),
    'invoices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'invoice_number', i.invoice_number, 'issue_date', i.issue_date,
        'due_date', i.due_date, 'total_amount', i.total_amount,
        'paid_amount', i.paid_amount, 'status', i.status, 'pdf_url', i.pdf_url
      ) ORDER BY i.issue_date DESC)
      FROM public.invoices i
      WHERE i.lead_id = v_lead_id AND i.deleted_at IS NULL
    ), '[]'::jsonb),
    'photos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'stage', sp.stage, 'photo_url', sp.photo_url,
        'caption', sp.caption, 'created_at', sp.created_at
      ) ORDER BY sp.created_at DESC)
      FROM public.project_stage_photos sp
      WHERE sp.lead_id = v_lead_id
    ), '[]'::jsonb),
    'files', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'file_name', f.file_name, 'file_url', f.file_url,
        'file_type', f.file_type, 'created_at', f.created_at
      ) ORDER BY f.created_at DESC)
      FROM public.project_files f
      WHERE f.lead_id = v_lead_id
    ), '[]'::jsonb),
    'company', (
      SELECT jsonb_build_object(
        'name', c.company_name, 'tagline', c.tagline,
        'phone', c.phone, 'email', c.email, 'website', c.website,
        'logo_url', c.logo_url, 'accent_color', c.accent_color
      ) FROM public.company_settings c LIMIT 1
    )
  ) INTO v_data;

  RETURN v_data;
END; $function$;

-- ==========================================
-- Migration File: 20260426042022_8972b033-7a1f-47a9-b9a5-c2bef74ac5ac.sql
-- ==========================================

-- Add client portal WhatsApp greeting template column
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS client_portal_whatsapp_template text;

-- Update get_client_portal_data to expose whatsapp + template
CREATE OR REPLACE FUNCTION public.get_client_portal_data(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id uuid;
  v_link_id uuid;
  v_data jsonb;
BEGIN
  SELECT id, lead_id INTO v_link_id, v_lead_id
    FROM public.client_share_links
    WHERE token = _token
      AND revoked = false
      AND (expires_at IS NULL OR expires_at > now());
  IF v_lead_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.client_share_links
    SET view_count = view_count + 1, last_viewed_at = now()
    WHERE id = v_link_id;

  SELECT jsonb_build_object(
    'lead', (
      SELECT jsonb_build_object(
        'name', l.name, 'project_type', l.project_type,
        'city', l.city, 'stage', l.stage, 'created_at', l.created_at
      ) FROM public.leads l WHERE l.id = v_lead_id AND l.deleted_at IS NULL
    ),
    'quotation', (
      SELECT jsonb_build_object(
        'quotation_number', q.quotation_number, 'project_name', q.project_name,
        'subtotal', q.subtotal, 'discount_amount', q.discount_amount,
        'gst_amount', q.gst_amount, 'total_amount', q.total_amount,
        'sent_at', q.sent_at, 'pdf_url', q.pdf_url,
        'status', q.status, 'workflow_status', q.workflow_status,
        'client_approved_at', q.client_approved_at,
        'payment_link_url', q.payment_link_url,
        'auto_project_id', q.auto_project_id
      ) FROM public.quotations q
        WHERE q.lead_id = v_lead_id AND q.deleted_at IS NULL
        ORDER BY q.created_at DESC LIMIT 1
    ),
    'project', (
      SELECT jsonb_build_object(
        'id', p.id, 'name', p.name, 'status', p.status,
        'progress_pct', p.progress_pct, 'start_date', p.start_date,
        'target_end_date', p.target_end_date,
        'milestones', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'title', m.title, 'target_date', m.target_date,
            'completed_at', m.completed_at, 'sort_order', m.sort_order
          ) ORDER BY m.sort_order)
          FROM public.project_milestones m WHERE m.project_id = p.id
        ), '[]'::jsonb)
      )
      FROM public.projects p
      WHERE p.lead_id = v_lead_id AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC LIMIT 1
    ),
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'paid_on', p.paid_on, 'amount', p.amount, 'milestone', p.milestone, 'mode', p.mode
      ) ORDER BY p.paid_on DESC)
      FROM public.payments p
      WHERE p.lead_id = v_lead_id AND p.deleted_at IS NULL
    ), '[]'::jsonb),
    'invoices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'invoice_number', i.invoice_number, 'issue_date', i.issue_date,
        'due_date', i.due_date, 'total_amount', i.total_amount,
        'paid_amount', i.paid_amount, 'status', i.status, 'pdf_url', i.pdf_url
      ) ORDER BY i.issue_date DESC)
      FROM public.invoices i
      WHERE i.lead_id = v_lead_id AND i.deleted_at IS NULL
    ), '[]'::jsonb),
    'photos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'stage', sp.stage, 'photo_url', sp.photo_url,
        'caption', sp.caption, 'created_at', sp.created_at
      ) ORDER BY sp.created_at DESC)
      FROM public.project_stage_photos sp
      WHERE sp.lead_id = v_lead_id
    ), '[]'::jsonb),
    'files', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'file_name', f.file_name, 'file_url', f.file_url,
        'file_type', f.file_type, 'created_at', f.created_at
      ) ORDER BY f.created_at DESC)
      FROM public.project_files f
      WHERE f.lead_id = v_lead_id
    ), '[]'::jsonb),
    'company', (
      SELECT jsonb_build_object(
        'name', c.company_name, 'tagline', c.tagline,
        'phone', c.phone, 'whatsapp', c.whatsapp,
        'email', c.email, 'website', c.website,
        'logo_url', c.logo_url, 'accent_color', c.accent_color,
        'client_portal_whatsapp_template', c.client_portal_whatsapp_template
      ) FROM public.company_settings c LIMIT 1
    )
  ) INTO v_data;

  RETURN v_data;
END; $function$;

-- ==========================================
-- Migration File: 20260426043254_395a9f15-0869-4d30-87cc-60ee55a77e3f.sql
-- ==========================================

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS payment_link_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_status text;

-- ==========================================
-- Migration File: 20260426061643_2f5295ab-49e2-4d92-9e83-d83e6eed9e1d.sql
-- ==========================================

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

-- ==========================================
-- Migration File: 20260426062922_068240d6-e6d7-43f7-b2bd-0f609e0178a9.sql
-- ==========================================

-- PO status timeline: history table
CREATE TABLE IF NOT EXISTS public.po_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  note text,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_status_history_po ON public.po_status_history(purchase_order_id, created_at);



-- ==========================================
-- Migration File: 20260426064232_3b9df191-2410-43ba-8e4f-92d866c0525e.sql
-- ==========================================

-- 1. company_settings: restrict SELECT to authenticated only

-- 2. team_members: restrict SELECT to admin/manager

-- 3. quotations table: tighten INSERT

-- 6. Storage: project-files bucket — admin/manager only for writes

-- 7. Storage: company-assets bucket — admin/manager only for writes (public SELECT remains)



-- ==========================================
-- Migration File: 20260426064303_63210b21-46f6-499b-b069-a9ce8444ccb1.sql
-- ==========================================

-- Restore anonymous uploads for floorplans (used by public quote forms)

CREATE POLICY "Anyone can upload floorplans"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'floorplans');

-- Restore anonymous uploads for resumes (used by public careers page)

CREATE POLICY "Anyone can upload resumes"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'resumes');

-- ==========================================
-- Migration File: 20260426064646_3cefbadd-f514-44b9-b920-51cb30630599.sql
-- ==========================================

-- Ensure RLS is enabled on realtime.messages (Supabase default, safe to re-assert)

-- Restrict SELECT (subscription receive) on the 'leads' topic to admin/manager



-- ==========================================
-- Migration File: 20260426071528_a531b3c0-9e87-4cf7-9c6b-b32a583c7d84.sql
-- ==========================================

-- Phase 1: Operations & Data
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'gray',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_lead_sources BEFORE UPDATE ON public.lead_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_lead_tags BEFORE UPDATE ON public.lead_tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'bg-blue-500',
  sub_statuses jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_pipeline_stages BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.lead_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  match_source text,
  match_city text,
  assign_to text,
  round_robin_pool jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_lead_routing_rules BEFORE UPDATE ON public.lead_routing_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS dedup_warn_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dedup_auto_merge boolean NOT NULL DEFAULT false;

-- Seed pipeline stages from current STAGES constant
INSERT INTO public.pipeline_stages (key, label, color, sub_statuses, sort_order) VALUES
  ('leads',       'Leads',       'bg-blue-500',   '["New Lead","Called","Not Picked","Interested","Not Interested","Follow-up Later"]'::jsonb, 1),
  ('follow_up',   'Follow-up',   'bg-yellow-500', '["Pending","In Progress","Done"]'::jsonb, 2),
  ('site_visit',  'Site Visit',  'bg-orange-500', '["Scheduled","Visited","Measurement Taken"]'::jsonb, 3),
  ('booking',     'Booking',     'bg-pink-500',   '["Quotation Shared","Negotiation","Booked (10% Advance)"]'::jsonb, 4),
  ('designing',   'Designing',   'bg-purple-500', '["In Designing","Design Shared","Design Approved"]'::jsonb, 5),
  ('execution',   'Execution',   'bg-indigo-500', '["Site Cross Verified","Production Started","50% Advance Received","Installation Started","Installation Done"]'::jsonb, 6),
  ('handover',    'Handover',    'bg-teal-500',   '["Deep Cleaning","Handover Done","100% Payment Received"]'::jsonb, 7),
  ('completed',   'Completed',   'bg-green-500',  '["Review Link Sent","Review Received"]'::jsonb, 8)
ON CONFLICT (key) DO NOTHING;

-- Seed lead sources from current SOURCE_COLORS keys
INSERT INTO public.lead_sources (key, label, color, sort_order) VALUES
  ('popup',           'Website Popup',     'amber', 1),
  ('quote_modal',     'Quote Modal',       'blue', 2),
  ('contact_form',    'Contact Form',      'green', 3),
  ('price_calculator','Price Calculator',  'purple', 4),
  ('google_meta_ads', 'Google/Meta Ads',   'red', 5),
  ('career',          'Career Form',       'cyan', 6),
  ('walk_in',         'Walk-In',           'emerald', 7),
  ('google_ads',      'Google Ads',        'red', 8),
  ('meta_ads',        'Meta Ads',          'indigo', 9),
  ('referral',        'Referral',          'pink', 10),
  ('bni_referral',    'BNI Referral',      'orange', 11)
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- Migration File: 20260426071952_e8113ce2-c641-4500-a3ba-f9620cd014a4.sql
-- ==========================================

-- Phase 2: Quotation & Finance settings

-- 1) Add discount caps + invoice numbering format to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS discount_cap_executive_pct numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS discount_cap_manager_pct numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS discount_cap_admin_pct numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS invoice_number_format text NOT NULL DEFAULT 'INV/{FY}/{SEQ:0000}',
  ADD COLUMN IF NOT EXISTS quotation_number_format text NOT NULL DEFAULT 'QT/{FY}/{SEQ:0000}';

-- 2) GST presets
CREATE TABLE IF NOT EXISTS public.gst_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  rate numeric NOT NULL,
  hsn_sac_code text,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_gst_presets_updated_at BEFORE UPDATE ON public.gst_presets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO public.gst_presets (label, rate, hsn_sac_code, is_default, sort_order) VALUES
  ('GST 18% (Standard)', 18, '9954', true, 1),
  ('GST 12%', 12, '9954', false, 2),
  ('GST 5%', 5, '9954', false, 3),
  ('GST 0% (Exempt)', 0, NULL, false, 4)
ON CONFLICT DO NOTHING;

-- 3) Payment milestone templates
CREATE TABLE IF NOT EXISTS public.payment_milestone_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.payment_milestone_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.payment_milestone_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  percentage numeric NOT NULL,
  due_offset_days integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_milestone_templates_updated_at BEFORE UPDATE ON public.payment_milestone_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed a default 40/40/20 template
DO $$
DECLARE tpl_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.payment_milestone_templates) THEN
    INSERT INTO public.payment_milestone_templates (name, description, is_default) VALUES
      ('Standard 40/40/20', '40% advance, 40% on production, 20% on delivery', true)
      RETURNING id INTO tpl_id;
    INSERT INTO public.payment_milestone_template_items (template_id, label, percentage, due_offset_days, sort_order) VALUES
      (tpl_id, 'Advance', 40, 0, 1),
      (tpl_id, 'On Production', 40, 15, 2),
      (tpl_id, 'On Delivery', 20, 45, 3);
  END IF;
END $$;

-- 4) Expense categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#64748b',
  budget_monthly numeric,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO public.expense_categories (name, color, sort_order) VALUES
  ('Materials', '#3b82f6', 1),
  ('Labor', '#f59e0b', 2),
  ('Transport', '#10b981', 3),
  ('Marketing', '#ec4899', 4),
  ('Office', '#8b5cf6', 5),
  ('Miscellaneous', '#64748b', 6)
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- Migration File: 20260426081001_a5dd1fd3-29cc-4956-967d-5977c28220d4.sql
-- ==========================================


-- C3: Extend company_settings for tenant branding & locale
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS currency_symbol text DEFAULT '₹',
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS fy_start_month int DEFAULT 4,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- C3: Branding storage bucket (logos, favicons)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of branding assets (logo shown in client portal, PDFs)
DO $$ BEGIN
  
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- B1: First-user-becomes-admin trigger
-- Replace the existing handle_new_user to also assign admin role to the first user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_count int;
BEGIN
  -- Always create the profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  -- Count existing profiles (excluding this new one) — first user gets admin
  SELECT COUNT(*) INTO v_user_count FROM public.profiles WHERE id <> NEW.id;
  IF v_user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- Migration File: 20260426081028_dad49410-d079-4a5b-b8d7-897f9f1a063b.sql
-- ==========================================


-- Replace permissive write policies with admin/manager-only policies



-- ==========================================
-- Migration File: 20260426092934_1ac48f2c-7a0d-444b-ba37-a62c682d682b.sql
-- ==========================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- ==========================================
-- Migration File: 20260426100746_c0cfb973-afec-4aba-a613-1846625a80aa.sql
-- ==========================================

ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS address text;

-- ==========================================
-- Migration File: 20260426101203_6e356055-bd57-4a1f-9e51-e65ae9ef914a.sql
-- ==========================================


CREATE OR REPLACE FUNCTION public.complete_onboarding(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing_id uuid;
  v_admin_exists boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Bootstrap: if there is no admin/manager at all yet, make this user admin.
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('admin','manager'))
    INTO v_admin_exists;
  IF NOT v_admin_exists THEN
    INSERT INTO public.user_roles (user_id, role)
      VALUES (v_uid, 'admin')
      ON CONFLICT DO NOTHING;
  END IF;

  -- Also guarantee the calling user has SOME role so they can use the app.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    INSERT INTO public.user_roles (user_id, role)
      VALUES (v_uid, 'admin')
      ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_existing_id FROM public.company_settings LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.company_settings (
      company_name, logo_url, phone, email, address, gstin,
      primary_color, accent_color, currency, currency_symbol,
      timezone, fy_start_month, onboarding_completed_at
    ) VALUES (
      COALESCE(payload->>'company_name',''),
      NULLIF(payload->>'logo_url',''),
      NULLIF(payload->>'phone',''),
      NULLIF(payload->>'email',''),
      NULLIF(payload->>'address',''),
      NULLIF(payload->>'gstin',''),
      NULLIF(payload->>'primary_color',''),
      COALESCE(NULLIF(payload->>'accent_color',''), '#0F2C5F'),
      COALESCE(NULLIF(payload->>'currency',''), 'INR'),
      COALESCE(NULLIF(payload->>'currency_symbol',''), '₹'),
      COALESCE(NULLIF(payload->>'timezone',''), 'Asia/Kolkata'),
      COALESCE((payload->>'fy_start_month')::int, 4),
      now()
    ) RETURNING id INTO v_existing_id;
  ELSE
    UPDATE public.company_settings SET
      company_name = COALESCE(NULLIF(payload->>'company_name',''), company_name),
      logo_url = COALESCE(NULLIF(payload->>'logo_url',''), logo_url),
      phone = COALESCE(NULLIF(payload->>'phone',''), phone),
      email = COALESCE(NULLIF(payload->>'email',''), email),
      address = COALESCE(NULLIF(payload->>'address',''), address),
      gstin = COALESCE(NULLIF(payload->>'gstin',''), gstin),
      primary_color = COALESCE(NULLIF(payload->>'primary_color',''), primary_color),
      accent_color = COALESCE(NULLIF(payload->>'accent_color',''), accent_color),
      currency = COALESCE(NULLIF(payload->>'currency',''), currency),
      currency_symbol = COALESCE(NULLIF(payload->>'currency_symbol',''), currency_symbol),
      timezone = COALESCE(NULLIF(payload->>'timezone',''), timezone),
      fy_start_month = COALESCE((payload->>'fy_start_month')::int, fy_start_month),
      onboarding_completed_at = now(),
      updated_at = now()
    WHERE id = v_existing_id;
  END IF;

  RETURN jsonb_build_object('id', v_existing_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(jsonb) TO authenticated;


-- ==========================================
-- Migration File: 20260426105036_300d4e1d-d920-4929-b8d8-2f352508a40c.sql
-- ==========================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_tour_completed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.profiles SET tour_completed_at = now() WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_tour_completed() TO authenticated;

-- ==========================================
-- Migration File: 20260427104600_36dc053b-afab-4fbb-95e1-faa6286c3bb5.sql
-- ==========================================


-- =========================================================================
-- 1. CORE TENANT TABLES
-- =========================================================================
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_members (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);
CREATE UNIQUE INDEX tenant_members_user_unique ON public.tenant_members(user_id);

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.default_public_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1
$$;

-- =========================================================================
-- 2. SEED MOHAN INTERIOR TENANT
-- =========================================================================
DO $$
DECLARE
  v_tenant_id uuid;
  v_admin_id uuid := '359a85cc-d3e0-4b18-8238-d365be95eb20';
BEGIN
  INSERT INTO public.tenants (name, created_by) VALUES ('Mohan Interior', v_admin_id)
    RETURNING id INTO v_tenant_id;
  INSERT INTO public.tenant_members (tenant_id, user_id)
    SELECT v_tenant_id, id FROM public.profiles
    ON CONFLICT DO NOTHING;
END $$;

-- =========================================================================
-- 3. ADD tenant_id TO ALL BUSINESS TABLES + BACKFILL
-- =========================================================================
DO $$
DECLARE
  v_default uuid;
  t text;
  business_tables text[] := ARRAY[
    'leads','quotations','quotation_rooms','quotation_room_items','quotation_versions',
    'quotation_workflow_log','quotation_send_history','invoices','payments','expenses',
    'projects','project_milestones','project_materials','project_boq_items','project_files',
    'project_stage_photos','lead_follow_ups','lead_messages','client_share_links',
    'company_settings','app_settings','team_members','message_templates','pipeline_stages',
    'lead_sources','lead_tags','lead_routing_rules','brand_catalog','pricing_catalog',
    'pricing_rooms','pricing_item_categories','material_pricing','material_room_pricing',
    'expense_categories','gst_presets','payment_milestone_templates',
    'payment_milestone_template_items','boq_products','boq_product_vendors','vendors',
    'purchase_orders','po_status_history','activity_log','finance_reminder_log',
    'digest_log','tasks','recurring_invoice_templates','room_category_map',
    'vendor_po_dispatch_log','invoice_fy_seq'
  ];
BEGIN
  SELECT id INTO v_default FROM public.tenants ORDER BY created_at ASC LIMIT 1;

  FOREACH t IN ARRAY business_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid', t);
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, v_default);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', t || '_tenant_idx', t);
  END LOOP;
END $$;

-- Per-tenant invoice sequence
ALTER TABLE public.invoice_fy_seq DROP CONSTRAINT IF EXISTS invoice_fy_seq_pkey;
ALTER TABLE public.invoice_fy_seq ADD PRIMARY KEY (tenant_id, fy_start);

-- =========================================================================
-- 4. AUTOFILL TRIGGER: set tenant_id on insert if not provided
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_tenant_id_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  v_tenant := current_tenant_id();
  IF v_tenant IS NULL THEN
    v_tenant := default_public_tenant_id();
  END IF;
  NEW.tenant_id := v_tenant;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'leads','quotations','quotation_rooms','quotation_room_items','quotation_versions',
    'quotation_workflow_log','quotation_send_history','invoices','payments','expenses',
    'projects','project_milestones','project_materials','project_boq_items','project_files',
    'project_stage_photos','lead_follow_ups','lead_messages','client_share_links',
    'company_settings','app_settings','team_members','message_templates','pipeline_stages',
    'lead_sources','lead_tags','lead_routing_rules','brand_catalog','pricing_catalog',
    'pricing_rooms','pricing_item_categories','material_pricing','material_room_pricing',
    'expense_categories','gst_presets','payment_milestone_templates',
    'payment_milestone_template_items','boq_products','boq_product_vendors','vendors',
    'purchase_orders','po_status_history','activity_log','finance_reminder_log',
    'digest_log','tasks','recurring_invoice_templates','room_category_map',
    'vendor_po_dispatch_log','invoice_fy_seq'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default()', t);
  END LOOP;
END $$;

-- =========================================================================
-- 5. DROP OLD POLICIES & CREATE TENANT-SCOPED ONES
-- =========================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public'
      AND tablename = ANY(ARRAY[
        'leads','quotations','quotation_rooms','quotation_room_items','quotation_versions',
        'quotation_workflow_log','quotation_send_history','invoices','payments','expenses',
        'projects','project_milestones','project_materials','project_boq_items','project_files',
        'project_stage_photos','lead_follow_ups','lead_messages','client_share_links',
        'company_settings','app_settings','team_members','message_templates','pipeline_stages',
        'lead_sources','lead_tags','lead_routing_rules','brand_catalog','pricing_catalog',
        'pricing_rooms','pricing_item_categories','material_pricing','material_room_pricing',
        'expense_categories','gst_presets','payment_milestone_templates',
        'payment_milestone_template_items','boq_products','boq_product_vendors','vendors',
        'purchase_orders','po_status_history','activity_log','finance_reminder_log',
        'digest_log','tasks','recurring_invoice_templates','room_category_map',
        'vendor_po_dispatch_log','invoice_fy_seq'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- LEADS

-- View+admin pattern
DO $$
DECLARE
  t text;
  view_only_tables text[] := ARRAY[
    'app_settings','company_settings','message_templates','pipeline_stages',
    'lead_sources','lead_tags','lead_routing_rules','brand_catalog','pricing_catalog',
    'pricing_rooms','pricing_item_categories','material_pricing','material_room_pricing',
    'expense_categories','gst_presets','payment_milestone_templates',
    'payment_milestone_template_items','boq_products','boq_product_vendors',
    'room_category_map'
  ];
BEGIN
  FOREACH t IN ARRAY view_only_tables LOOP
    EXECUTE format($f$
    EXECUTE format($f$
  END LOOP;
END $$;

-- Quotations

-- Finance

-- Projects

-- Lead-related

-- Vendors / POs

-- Tasks

-- Team

-- Logs

-- =========================================================================
-- 6. UPDATED RPCs
-- =========================================================================
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_fy int;
  v_seq int;
  v_tenant uuid := current_tenant_id();
BEGIN
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'No tenant for current user'; END IF;
  IF EXTRACT(MONTH FROM v_today) >= 4 THEN
    v_fy := EXTRACT(YEAR FROM v_today)::int;
  ELSE
    v_fy := EXTRACT(YEAR FROM v_today)::int - 1;
  END IF;
  INSERT INTO public.invoice_fy_seq(tenant_id, fy_start, last_seq)
    VALUES (v_tenant, v_fy, 1)
    ON CONFLICT (tenant_id, fy_start)
    DO UPDATE SET last_seq = invoice_fy_seq.last_seq + 1, updated_at = now()
    RETURNING last_seq INTO v_seq;
  RETURN 'HC-INV-' || v_fy::text || '-' || LPAD(v_seq::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_onboarding(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_settings_id uuid;
  v_company_name text := COALESCE(NULLIF(payload->>'company_name',''), 'My Studio');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.tenant_members WHERE user_id = v_uid LIMIT 1;
  IF v_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, created_by) VALUES (v_company_name, v_uid)
      RETURNING id INTO v_tenant_id;
    INSERT INTO public.tenant_members (tenant_id, user_id) VALUES (v_tenant_id, v_uid)
      ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.tenants SET name = v_company_name WHERE id = v_tenant_id AND created_by = v_uid;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin')
    ON CONFLICT DO NOTHING;

  SELECT id INTO v_settings_id FROM public.company_settings WHERE tenant_id = v_tenant_id LIMIT 1;
  IF v_settings_id IS NULL THEN
    INSERT INTO public.company_settings (
      tenant_id, company_name, logo_url, phone, email, address, gstin,
      primary_color, accent_color, currency, currency_symbol,
      timezone, fy_start_month, onboarding_completed_at
    ) VALUES (
      v_tenant_id, v_company_name,
      NULLIF(payload->>'logo_url',''),
      NULLIF(payload->>'phone',''),
      NULLIF(payload->>'email',''),
      NULLIF(payload->>'address',''),
      NULLIF(payload->>'gstin',''),
      NULLIF(payload->>'primary_color',''),
      COALESCE(NULLIF(payload->>'accent_color',''), '#0F2C5F'),
      COALESCE(NULLIF(payload->>'currency',''), 'INR'),
      COALESCE(NULLIF(payload->>'currency_symbol',''), '₹'),
      COALESCE(NULLIF(payload->>'timezone',''), 'Asia/Kolkata'),
      COALESCE((payload->>'fy_start_month')::int, 4),
      now()
    ) RETURNING id INTO v_settings_id;
  ELSE
    UPDATE public.company_settings SET
      company_name = v_company_name,
      logo_url = COALESCE(NULLIF(payload->>'logo_url',''), logo_url),
      phone = COALESCE(NULLIF(payload->>'phone',''), phone),
      email = COALESCE(NULLIF(payload->>'email',''), email),
      address = COALESCE(NULLIF(payload->>'address',''), address),
      gstin = COALESCE(NULLIF(payload->>'gstin',''), gstin),
      primary_color = COALESCE(NULLIF(payload->>'primary_color',''), primary_color),
      accent_color = COALESCE(NULLIF(payload->>'accent_color',''), accent_color),
      currency = COALESCE(NULLIF(payload->>'currency',''), currency),
      currency_symbol = COALESCE(NULLIF(payload->>'currency_symbol',''), currency_symbol),
      timezone = COALESCE(NULLIF(payload->>'timezone',''), timezone),
      fy_start_month = COALESCE((payload->>'fy_start_month')::int, fy_start_month),
      onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
      updated_at = now()
    WHERE id = v_settings_id;
  END IF;

  RETURN jsonb_build_object('id', v_settings_id, 'tenant_id', v_tenant_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ==========================================
-- Migration File: 20260427104658_ee431f58-6154-4598-865a-d1308e93aaf4.sql
-- ==========================================


DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'leads','quotations','quotation_rooms','quotation_room_items','quotation_versions',
    'quotation_workflow_log','quotation_send_history','invoices','payments','expenses',
    'projects','project_milestones','project_materials','project_boq_items','project_files',
    'project_stage_photos','lead_follow_ups','lead_messages','client_share_links',
    'company_settings','app_settings','team_members','message_templates','pipeline_stages',
    'lead_sources','lead_tags','lead_routing_rules','brand_catalog','pricing_catalog',
    'pricing_rooms','pricing_item_categories','material_pricing','material_room_pricing',
    'expense_categories','gst_presets','payment_milestone_templates',
    'payment_milestone_template_items','boq_products','boq_product_vendors','vendors',
    'purchase_orders','po_status_history','activity_log','finance_reminder_log',
    'digest_log','tasks','recurring_invoice_templates','room_category_map',
    'vendor_po_dispatch_log','invoice_fy_seq'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()', t);
  END LOOP;
END $$;


-- ==========================================
-- Migration File: 20260427130757_bae61382-6f0b-4a6a-9241-cfce96f19aa2.sql
-- ==========================================

-- razorpay_plans: lookup table from app plan/cycle/variant -> Razorpay plan_id
CREATE TABLE public.razorpay_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan text NOT NULL CHECK (plan IN ('pro','studio')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  variant text NOT NULL DEFAULT 'standard' CHECK (variant IN ('standard','promo50')),
  razorpay_plan_id text,
  amount_inr integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan, billing_cycle, variant)
);

CREATE TRIGGER trg_razorpay_plans_updated_at
  BEFORE UPDATE ON public.razorpay_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the 6 known variants (razorpay_plan_id filled in by seed function later)
INSERT INTO public.razorpay_plans (plan, billing_cycle, variant, amount_inr) VALUES
  ('pro',    'monthly', 'standard', 2499),
  ('pro',    'monthly', 'promo50',  1249),
  ('pro',    'yearly',  'standard', 23990),
  ('studio', 'monthly', 'standard', 5999),
  ('studio', 'monthly', 'promo50',  2999),
  ('studio', 'yearly',  'standard', 57590);

-- subscriptions: one active row per tenant
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  plan text NOT NULL CHECK (plan IN ('free','pro','studio')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  razorpay_subscription_id text UNIQUE,
  razorpay_plan_id text,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','authenticated','active','pending','halted','cancelled','completed','expired')),
  current_start timestamptz,
  current_end timestamptz,
  promo_locked boolean NOT NULL DEFAULT false,
  short_url text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);

-- Tenant members can read their tenant's subscriptions

-- No client write/update/delete — service role bypasses RLS

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper RPC to get the current user's tenant subscription
CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS TABLE (
  id uuid, plan text, billing_cycle text, status text,
  current_start timestamptz, current_end timestamptz,
  promo_locked boolean, razorpay_subscription_id text, short_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.plan, s.billing_cycle, s.status, s.current_start, s.current_end,
         s.promo_locked, s.razorpay_subscription_id, s.short_url
  FROM public.subscriptions s
  WHERE s.tenant_id = public.current_tenant_id()
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

-- ==========================================
-- Migration File: 20260428031624_30a2b4ed-f220-4ff7-8973-65af641ff406.sql
-- ==========================================

-- PDF Theme Editor: extend company_settings with theme + document text fields.
-- All columns are nullable; the app applies sensible defaults when NULL.

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS heading_font            text,
  ADD COLUMN IF NOT EXISTS body_font               text,
  ADD COLUMN IF NOT EXISTS base_font_size          text,
  ADD COLUMN IF NOT EXISTS logo_position           text,
  ADD COLUMN IF NOT EXISTS accent_style            text,
  ADD COLUMN IF NOT EXISTS table_style             text,
  ADD COLUMN IF NOT EXISTS show_brand_strip        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_trust_strip        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_signature_block    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_terms_block        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS watermark_text          text,
  ADD COLUMN IF NOT EXISTS watermark_opacity       numeric NOT NULL DEFAULT 0.08,
  ADD COLUMN IF NOT EXISTS quotation_footer_note   text,
  ADD COLUMN IF NOT EXISTS invoice_footer_note     text,
  ADD COLUMN IF NOT EXISTS terms_text              text,
  ADD COLUMN IF NOT EXISTS bank_details_text       text;

-- Soft validation via CHECK constraints (use NULL-tolerant predicates).
ALTER TABLE public.company_settings
  DROP CONSTRAINT IF EXISTS company_settings_base_font_size_check;
ALTER TABLE public.company_settings
  ADD CONSTRAINT company_settings_base_font_size_check
  CHECK (base_font_size IS NULL OR base_font_size IN ('compact','normal','large'));

ALTER TABLE public.company_settings
  DROP CONSTRAINT IF EXISTS company_settings_logo_position_check;
ALTER TABLE public.company_settings
  ADD CONSTRAINT company_settings_logo_position_check
  CHECK (logo_position IS NULL OR logo_position IN ('left','center'));

ALTER TABLE public.company_settings
  DROP CONSTRAINT IF EXISTS company_settings_accent_style_check;
ALTER TABLE public.company_settings
  ADD CONSTRAINT company_settings_accent_style_check
  CHECK (accent_style IS NULL OR accent_style IN ('bar','underline','none'));

ALTER TABLE public.company_settings
  DROP CONSTRAINT IF EXISTS company_settings_table_style_check;
ALTER TABLE public.company_settings
  ADD CONSTRAINT company_settings_table_style_check
  CHECK (table_style IS NULL OR table_style IN ('striped','bordered','minimal'));

ALTER TABLE public.company_settings
  DROP CONSTRAINT IF EXISTS company_settings_watermark_opacity_check;
ALTER TABLE public.company_settings
  ADD CONSTRAINT company_settings_watermark_opacity_check
  CHECK (watermark_opacity >= 0 AND watermark_opacity <= 1);

-- ==========================================
-- Migration File: 20260428034910_d56e0232-f72f-4ade-9315-a0bcaf42050c.sql
-- ==========================================

-- Add attribution columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS ad_id text,
  ADD COLUMN IF NOT EXISTS form_id text;

-- 1. marketing_channels
CREATE TABLE IF NOT EXISTS public.marketing_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  channel_type text NOT NULL,            -- meta | google_ads | whatsapp_cloud | whatsapp_thirdparty
  display_name text,
  status text NOT NULL DEFAULT 'not_connected', -- not_connected | connected | error
  config jsonb NOT NULL DEFAULT '{}'::jsonb,    -- non-secret fields (page_id, phone_number_id, verify_token, webhook_url, third_party_webhook_url, etc.)
  secret_ref text,                              -- name of the secret holding the access token
  last_event_at timestamptz,
  last_error text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, channel_type)
);

CREATE TRIGGER trg_marketing_channels_updated_at
  BEFORE UPDATE ON public.marketing_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. marketing_campaigns
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  name text NOT NULL,
  channel_type text NOT NULL DEFAULT 'whatsapp_cloud',
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience_csv_url text,
  template_name text,
  template_language text DEFAULT 'en',
  template_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_body text,                       -- used for 3rd-party / generic webhook campaigns
  status text NOT NULL DEFAULT 'draft',    -- draft | scheduled | sending | completed | failed | cancelled
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  audience_count integer NOT NULL DEFAULT 0,
  stats jsonb NOT NULL DEFAULT '{"sent":0,"delivered":0,"read":0,"replied":0,"failed":0}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant_status
  ON public.marketing_campaigns(tenant_id, status, created_at DESC);

-- 3. marketing_campaign_recipients
CREATE TABLE IF NOT EXISTS public.marketing_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  lead_id uuid,
  phone text NOT NULL,
  name text,
  merged_vars jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued',  -- queued | sent | delivered | read | failed
  error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_recipients_campaign
  ON public.marketing_campaign_recipients(campaign_id, status);

-- 4. marketing_inbound_leads (raw webhook log)
CREATE TABLE IF NOT EXISTS public.marketing_inbound_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  channel_type text NOT NULL,
  campaign_name text,
  ad_name text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  lead_id uuid,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_inbound_tenant_created
  ON public.marketing_inbound_leads(tenant_id, created_at DESC);


-- ==========================================
-- Migration File: 20260428150556_25f9e2c1-fddb-4c35-a8a9-91da8bccfc4e.sql
-- ==========================================

-- Seed demo user for /studio dashboard preview
DO $$
DECLARE
  demo_user_id uuid;
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM auth.users WHERE email = 'demo@chirpeel.test' LIMIT 1;

  IF existing_id IS NULL THEN
    demo_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      demo_user_id,
      'authenticated',
      'authenticated',
      'demo@chirpeel.test',
      crypt('Demo@1234', gen_salt('bf')),
      now(),
      jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('full_name','Demo Studio'),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      demo_user_id,
      demo_user_id::text,
      jsonb_build_object('sub', demo_user_id::text, 'email', 'demo@chirpeel.test', 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );
  END IF;
END $$;

-- ==========================================
-- Migration File: 20260428165522_3c66f8ab-a2da-49b2-a40e-884653b1f448.sql
-- ==========================================

-- Track signup attempts per IP for rate limiting
CREATE TABLE public.signup_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  email text,
  success boolean NOT NULL DEFAULT false,
  user_agent text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_rate_limits_ip_time
  ON public.signup_rate_limits (ip_address, attempted_at DESC);

CREATE INDEX idx_signup_rate_limits_attempted_at
  ON public.signup_rate_limits (attempted_at);

-- RLS: lock the table down. Only the service role (edge functions) can touch it.

-- No policies for anon/authenticated → all client-side reads/writes denied by default.

-- Cleanup function — deletes records older than 7 days. Can be called manually
-- or scheduled later via pg_cron.
CREATE OR REPLACE FUNCTION public.cleanup_signup_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.signup_rate_limits
    WHERE attempted_at < now() - interval '7 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ==========================================
-- Migration File: 20260428175816_ed631572-72ec-4a15-a259-94990212663f.sql
-- ==========================================

-- Add new role values to the existing app_role enum.
-- Must run in its own migration so they are committed before being used.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accounts';


-- ==========================================
-- Migration File: 20260428175859_5e8e6041-a2b3-4d3d-9e23-ffccb2ec9778.sql
-- ==========================================

-- =====================================================================
-- BATCH 1 (part 2): Helper functions + policy updates using new roles
-- =====================================================================

-- Helper: is this user an "owner-equivalent" (owner/admin/manager)?
CREATE OR REPLACE FUNCTION public.is_owner_equivalent(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner','admin','manager')
  )
$$;

-- Update is_admin_or_manager to also include the new 'owner' role.
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner','admin','manager')
  )
$$;

-- Replace has_finance_access to also accept Owner + Accounts roles.
CREATE OR REPLACE FUNCTION public.has_finance_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_owner_equivalent(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role = 'accounts')
      OR public.has_permission(_user_id, 'finance')
$$;

-- Helper: lead access (Owner-equiv, Sales, Accounts, Designer can read all).
CREATE OR REPLACE FUNCTION public.has_lead_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_owner_equivalent(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role IN ('sales','accounts','designer'))
      OR public.has_permission(_user_id, 'leads')
$$;

-- Helper: project / vendor / BOQ access.
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_owner_equivalent(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role IN ('designer','sales','accounts'))
      OR public.has_permission(_user_id, 'projects')
$$;

-- Helper: who can manage team (invite users / change roles).
CREATE OR REPLACE FUNCTION public.can_manage_team(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_owner_equivalent(_user_id)
$$;

-- Helper: who can edit a sales record (any non-finance staff role).
CREATE OR REPLACE FUNCTION public.can_edit_sales(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_owner_equivalent(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role = 'sales')
$$;

-- =====================================================================
-- Widen LEADS read policy: Sales/Accounts/Designer can also read.
-- (Existing policy required admin/manager OR assignee.)
-- =====================================================================

-- Update lead UPDATE policy: sales role can update leads in their tenant.



-- ==========================================
-- Migration File: 20260428175927_d15c6218-be62-4436-a997-40018910eae3.sql
-- ==========================================

-- Revoke anon execute on the new helper functions added in this batch.
REVOKE EXECUTE ON FUNCTION public.is_owner_equivalent(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_lead_access(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_project_access(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_team(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_sales(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_owner_equivalent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_lead_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_sales(uuid) TO authenticated;


-- ==========================================
-- Migration File: 20260428182743_09b0f4ff-f6b2-42f3-b326-6535fc2b4b22.sql
-- ==========================================

-- ============================================================
-- Subscription invoices (charge history) + plan limits enforcement
-- ============================================================

-- 1. subscription_invoices: row per Razorpay subscription charge.
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  razorpay_subscription_id text,
  razorpay_invoice_id text UNIQUE,
  razorpay_payment_id text,
  amount_inr numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid',
  charged_at timestamptz NOT NULL DEFAULT now(),
  short_url text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_tenant ON public.subscription_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_sub ON public.subscription_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_charged_at ON public.subscription_invoices(charged_at DESC);

-- (No client INSERT/UPDATE/DELETE — only service-role writes from webhook.)

-- 2. Helper: resolve effective plan for a tenant.
CREATE OR REPLACE FUNCTION public.tenant_effective_plan(_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan
       FROM public.subscriptions
      WHERE tenant_id = _tenant_id
        AND status IN ('active','authenticated','pending')
      ORDER BY created_at DESC
      LIMIT 1),
    'free'
  );
$$;

-- 3. Limits config (kept in SQL so the trigger and the client agree).
CREATE OR REPLACE FUNCTION public.plan_limit(_plan text, _kind text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _plan
    WHEN 'free'   THEN CASE _kind
      WHEN 'lead'         THEN 25
      WHEN 'quote'        THEN 5
      WHEN 'project'      THEN 2
      WHEN 'team_member'  THEN 1
      ELSE NULL END
    WHEN 'pro'    THEN CASE _kind
      WHEN 'lead'         THEN NULL          -- unlimited
      WHEN 'quote'        THEN NULL
      WHEN 'project'      THEN 25
      WHEN 'team_member'  THEN 5
      ELSE NULL END
    WHEN 'studio' THEN CASE _kind
      WHEN 'lead'         THEN NULL
      WHEN 'quote'        THEN NULL
      WHEN 'project'      THEN NULL
      WHEN 'team_member'  THEN 25
      ELSE NULL END
    ELSE NULL END;
$$;

-- 4. Server-side enforcement trigger (defence in depth; the UI gates first).
CREATE OR REPLACE FUNCTION public.enforce_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := NEW.tenant_id;
  v_plan text;
  v_limit integer;
  v_count integer;
  v_kind text := TG_ARGV[0];
  v_month_start timestamptz := date_trunc('month', now());
BEGIN
  -- Skip if no tenant resolvable (public lead submissions, etc.)
  IF v_tenant IS NULL THEN RETURN NEW; END IF;

  v_plan := tenant_effective_plan(v_tenant);
  v_limit := plan_limit(v_plan, v_kind);

  -- NULL limit means unlimited.
  IF v_limit IS NULL THEN RETURN NEW; END IF;

  IF v_kind = 'lead' THEN
    SELECT count(*) INTO v_count
      FROM public.leads
      WHERE tenant_id = v_tenant
        AND deleted_at IS NULL
        AND created_at >= v_month_start;
  ELSIF v_kind = 'quote' THEN
    SELECT count(*) INTO v_count
      FROM public.quotations
      WHERE tenant_id = v_tenant
        AND deleted_at IS NULL
        AND created_at >= v_month_start;
  ELSIF v_kind = 'project' THEN
    SELECT count(*) INTO v_count
      FROM public.projects
      WHERE tenant_id = v_tenant
        AND deleted_at IS NULL
        AND status NOT IN ('completed','cancelled','archived');
  ELSE
    RETURN NEW;
  END IF;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'PLAN_LIMIT_REACHED: % limit of % for plan % exceeded', v_kind, v_limit, v_plan
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_lead_limit ON public.leads;
CREATE TRIGGER trg_enforce_lead_limit
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_plan_limits('lead');

DROP TRIGGER IF EXISTS trg_enforce_quote_limit ON public.quotations;
CREATE TRIGGER trg_enforce_quote_limit
  BEFORE INSERT ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_plan_limits('quote');

DROP TRIGGER IF EXISTS trg_enforce_project_limit ON public.projects;
CREATE TRIGGER trg_enforce_project_limit
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_plan_limits('project');


-- ==========================================
-- Migration File: 20260428190406_714a189b-ecb5-4fcc-907f-ae461d0b2b36.sql
-- ==========================================

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS specialties text[],
  ADD COLUMN IF NOT EXISTS avg_ticket text,
  ADD COLUMN IF NOT EXISTS typical_duration_days integer DEFAULT 45,
  ADD COLUMN IF NOT EXISTS service_areas text[],
  ADD COLUMN IF NOT EXISTS primary_city text DEFAULT 'Tirupur';

CREATE OR REPLACE FUNCTION public.complete_onboarding(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_settings_id uuid;
  v_company_name text := COALESCE(NULLIF(payload->>'company_name',''), 'My Studio');
  v_specialties text[];
  v_service_areas text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF payload ? 'specialties' AND jsonb_typeof(payload->'specialties') = 'array' THEN
    SELECT array_agg(value::text) INTO v_specialties
    FROM jsonb_array_elements_text(payload->'specialties');
  END IF;
  IF payload ? 'service_areas' AND jsonb_typeof(payload->'service_areas') = 'array' THEN
    SELECT array_agg(value::text) INTO v_service_areas
    FROM jsonb_array_elements_text(payload->'service_areas');
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.tenant_members WHERE user_id = v_uid LIMIT 1;
  IF v_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, created_by) VALUES (v_company_name, v_uid)
      RETURNING id INTO v_tenant_id;
    INSERT INTO public.tenant_members (tenant_id, user_id) VALUES (v_tenant_id, v_uid)
      ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.tenants SET name = v_company_name WHERE id = v_tenant_id AND created_by = v_uid;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin')
    ON CONFLICT DO NOTHING;

  SELECT id INTO v_settings_id FROM public.company_settings WHERE tenant_id = v_tenant_id LIMIT 1;
  IF v_settings_id IS NULL THEN
    INSERT INTO public.company_settings (
      tenant_id, company_name, logo_url, phone, email, address, gstin,
      primary_color, accent_color, currency, currency_symbol,
      timezone, fy_start_month,
      specialties, avg_ticket, typical_duration_days,
      service_areas, primary_city,
      onboarding_completed_at
    ) VALUES (
      v_tenant_id, v_company_name,
      NULLIF(payload->>'logo_url',''),
      NULLIF(payload->>'phone',''),
      NULLIF(payload->>'email',''),
      NULLIF(payload->>'address',''),
      NULLIF(payload->>'gstin',''),
      NULLIF(payload->>'primary_color',''),
      COALESCE(NULLIF(payload->>'accent_color',''), '#0F2C5F'),
      COALESCE(NULLIF(payload->>'currency',''), 'INR'),
      COALESCE(NULLIF(payload->>'currency_symbol',''), '₹'),
      COALESCE(NULLIF(payload->>'timezone',''), 'Asia/Kolkata'),
      COALESCE((payload->>'fy_start_month')::int, 4),
      v_specialties,
      NULLIF(payload->>'avg_ticket',''),
      COALESCE((payload->>'typical_duration_days')::int, 45),
      v_service_areas,
      COALESCE(NULLIF(payload->>'primary_city',''), 'Tirupur'),
      now()
    ) RETURNING id INTO v_settings_id;
  ELSE
    UPDATE public.company_settings SET
      company_name = v_company_name,
      logo_url = COALESCE(NULLIF(payload->>'logo_url',''), logo_url),
      phone = COALESCE(NULLIF(payload->>'phone',''), phone),
      email = COALESCE(NULLIF(payload->>'email',''), email),
      address = COALESCE(NULLIF(payload->>'address',''), address),
      gstin = COALESCE(NULLIF(payload->>'gstin',''), gstin),
      primary_color = COALESCE(NULLIF(payload->>'primary_color',''), primary_color),
      accent_color = COALESCE(NULLIF(payload->>'accent_color',''), accent_color),
      currency = COALESCE(NULLIF(payload->>'currency',''), currency),
      currency_symbol = COALESCE(NULLIF(payload->>'currency_symbol',''), currency_symbol),
      timezone = COALESCE(NULLIF(payload->>'timezone',''), timezone),
      fy_start_month = COALESCE((payload->>'fy_start_month')::int, fy_start_month),
      specialties = COALESCE(v_specialties, specialties),
      avg_ticket = COALESCE(NULLIF(payload->>'avg_ticket',''), avg_ticket),
      typical_duration_days = COALESCE((payload->>'typical_duration_days')::int, typical_duration_days),
      service_areas = COALESCE(v_service_areas, service_areas),
      primary_city = COALESCE(NULLIF(payload->>'primary_city',''), primary_city),
      onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
      updated_at = now()
    WHERE id = v_settings_id;
  END IF;

  RETURN jsonb_build_object('id', v_settings_id, 'tenant_id', v_tenant_id);
END;
$function$;

-- ==========================================
-- Migration File: 20260428191342_57d8d246-c7af-4b22-b15e-d19a808ea837.sql
-- ==========================================

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS hear_about_us text,
  ADD COLUMN IF NOT EXISTS hear_about_us_other text,
  ADD COLUMN IF NOT EXISTS primary_goal text;

CREATE OR REPLACE FUNCTION public.complete_onboarding(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_settings_id uuid;
  v_company_name text := COALESCE(NULLIF(payload->>'company_name',''), 'My Studio');
  v_specialties text[];
  v_service_areas text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF payload ? 'specialties' AND jsonb_typeof(payload->'specialties') = 'array' THEN
    SELECT array_agg(value::text) INTO v_specialties
    FROM jsonb_array_elements_text(payload->'specialties');
  END IF;
  IF payload ? 'service_areas' AND jsonb_typeof(payload->'service_areas') = 'array' THEN
    SELECT array_agg(value::text) INTO v_service_areas
    FROM jsonb_array_elements_text(payload->'service_areas');
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.tenant_members WHERE user_id = v_uid LIMIT 1;
  IF v_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, created_by) VALUES (v_company_name, v_uid)
      RETURNING id INTO v_tenant_id;
    INSERT INTO public.tenant_members (tenant_id, user_id) VALUES (v_tenant_id, v_uid)
      ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.tenants SET name = v_company_name WHERE id = v_tenant_id AND created_by = v_uid;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin')
    ON CONFLICT DO NOTHING;

  SELECT id INTO v_settings_id FROM public.company_settings WHERE tenant_id = v_tenant_id LIMIT 1;
  IF v_settings_id IS NULL THEN
    INSERT INTO public.company_settings (
      tenant_id, company_name, logo_url, phone, email, address, gstin,
      primary_color, accent_color, currency, currency_symbol,
      timezone, fy_start_month,
      specialties, avg_ticket, typical_duration_days,
      service_areas, primary_city,
      hear_about_us, hear_about_us_other, primary_goal,
      onboarding_completed_at
    ) VALUES (
      v_tenant_id, v_company_name,
      NULLIF(payload->>'logo_url',''),
      NULLIF(payload->>'phone',''),
      NULLIF(payload->>'email',''),
      NULLIF(payload->>'address',''),
      NULLIF(payload->>'gstin',''),
      NULLIF(payload->>'primary_color',''),
      COALESCE(NULLIF(payload->>'accent_color',''), '#0F2C5F'),
      COALESCE(NULLIF(payload->>'currency',''), 'INR'),
      COALESCE(NULLIF(payload->>'currency_symbol',''), '₹'),
      COALESCE(NULLIF(payload->>'timezone',''), 'Asia/Kolkata'),
      COALESCE((payload->>'fy_start_month')::int, 4),
      v_specialties,
      NULLIF(payload->>'avg_ticket',''),
      COALESCE((payload->>'typical_duration_days')::int, 45),
      v_service_areas,
      COALESCE(NULLIF(payload->>'primary_city',''), 'Tirupur'),
      NULLIF(payload->>'hear_about_us',''),
      NULLIF(payload->>'hear_about_us_other',''),
      NULLIF(payload->>'primary_goal',''),
      now()
    ) RETURNING id INTO v_settings_id;
  ELSE
    UPDATE public.company_settings SET
      company_name = v_company_name,
      logo_url = COALESCE(NULLIF(payload->>'logo_url',''), logo_url),
      phone = COALESCE(NULLIF(payload->>'phone',''), phone),
      email = COALESCE(NULLIF(payload->>'email',''), email),
      address = COALESCE(NULLIF(payload->>'address',''), address),
      gstin = COALESCE(NULLIF(payload->>'gstin',''), gstin),
      primary_color = COALESCE(NULLIF(payload->>'primary_color',''), primary_color),
      accent_color = COALESCE(NULLIF(payload->>'accent_color',''), accent_color),
      currency = COALESCE(NULLIF(payload->>'currency',''), currency),
      currency_symbol = COALESCE(NULLIF(payload->>'currency_symbol',''), currency_symbol),
      timezone = COALESCE(NULLIF(payload->>'timezone',''), timezone),
      fy_start_month = COALESCE((payload->>'fy_start_month')::int, fy_start_month),
      specialties = COALESCE(v_specialties, specialties),
      avg_ticket = COALESCE(NULLIF(payload->>'avg_ticket',''), avg_ticket),
      typical_duration_days = COALESCE((payload->>'typical_duration_days')::int, typical_duration_days),
      service_areas = COALESCE(v_service_areas, service_areas),
      primary_city = COALESCE(NULLIF(payload->>'primary_city',''), primary_city),
      hear_about_us = COALESCE(NULLIF(payload->>'hear_about_us',''), hear_about_us),
      hear_about_us_other = COALESCE(NULLIF(payload->>'hear_about_us_other',''), hear_about_us_other),
      primary_goal = COALESCE(NULLIF(payload->>'primary_goal',''), primary_goal),
      onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
      updated_at = now()
    WHERE id = v_settings_id;
  END IF;

  RETURN jsonb_build_object('id', v_settings_id, 'tenant_id', v_tenant_id);
END;
$function$;

-- ==========================================
-- Migration File: 20260428194545_ad8f9a01-920c-4c51-98b5-486bce8a4974.sql
-- ==========================================

-- Public bucket for files attached in the AI chat
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Authenticated users can upload to their own folder; public read so AI/edge can fetch.



-- ==========================================
-- Migration File: 20260428200611_830114dc-9558-4ffc-a14b-2a21d5d1dc19.sql
-- ==========================================

-- team_invites table for admin-confirmed team member invitations
CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  email text NOT NULL,
  name text,
  phone text,
  proposed_role text NOT NULL DEFAULT 'sales',
  status text NOT NULL DEFAULT 'pending',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_tenant ON public.team_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON public.team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON public.team_invites(token);

-- Public token lookup (anon can read a single invite by token to accept it)

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_team_invites_updated_at ON public.team_invites;
CREATE TRIGGER trg_team_invites_updated_at
  BEFORE UPDATE ON public.team_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPC to accept invite: validates token, creates team_member row, assigns role
CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.team_invites%ROWTYPE;
  v_uid uuid := auth.uid();
  v_user_email text;
  v_role app_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite FROM public.team_invites
    WHERE token = _token AND status = 'pending' AND expires_at > now()
    LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_uid;
  IF lower(v_user_email) <> lower(v_invite.email) THEN
    RAISE EXCEPTION 'This invite is for a different email address';
  END IF;

  -- Add to tenant_members
  INSERT INTO public.tenant_members (tenant_id, user_id)
    VALUES (v_invite.tenant_id, v_uid)
    ON CONFLICT DO NOTHING;

  -- Assign role (cast text to app_role; fall back to 'sales' if invalid)
  BEGIN
    v_role := v_invite.proposed_role::app_role;
  EXCEPTION WHEN others THEN
    v_role := 'sales'::app_role;
  END;

  INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, v_role)
    ON CONFLICT DO NOTHING;

  -- Create team_member row if not exists
  INSERT INTO public.team_members (tenant_id, user_id, name, email, phone, role, active)
    VALUES (v_invite.tenant_id, v_uid, COALESCE(v_invite.name, v_user_email), v_invite.email, v_invite.phone, v_invite.proposed_role, true);

  -- Mark invite accepted
  UPDATE public.team_invites
    SET status = 'accepted', accepted_at = now(), accepted_user_id = v_uid, updated_at = now()
    WHERE id = v_invite.id;

  RETURN jsonb_build_object('tenant_id', v_invite.tenant_id, 'role', v_invite.proposed_role);
END;
$$;

-- ==========================================
-- Migration File: 20260428203627_afba362e-0f5e-4130-80e0-29361095e801.sql
-- ==========================================

-- Add core CRM tables to the realtime publication so that INSERT/UPDATE/DELETE events
-- stream to subscribed clients (studio dashboard, tasks workspace, etc).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'leads'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.leads';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quotations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.quotations';
  END IF;
END $$;

-- Make sure the realtime stream contains full row data on UPDATE/DELETE
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.quotations REPLICA IDENTITY FULL;

-- ==========================================
-- Migration File: 20260429064835_455d8739-88bf-4f8d-99d6-f2ceab552cb3.sql
-- ==========================================


ALTER TABLE public.pricing_rooms DROP CONSTRAINT IF EXISTS pricing_rooms_key_key;
ALTER TABLE public.pricing_rooms ADD CONSTRAINT pricing_rooms_tenant_key_key UNIQUE (tenant_id, key);

ALTER TABLE public.pricing_item_categories DROP CONSTRAINT IF EXISTS pricing_item_categories_key_key;
ALTER TABLE public.pricing_item_categories ADD CONSTRAINT pricing_item_categories_tenant_key_key UNIQUE (tenant_id, key);


-- ==========================================
-- Migration File: 20260429065015_a7cf0207-7b8c-49c1-a9d4-a245bdbd694c.sql
-- ==========================================


ALTER TABLE public.brand_catalog DROP CONSTRAINT IF EXISTS brand_catalog_category_key_key;
ALTER TABLE public.brand_catalog ADD CONSTRAINT brand_catalog_tenant_category_key_key UNIQUE (tenant_id, category, key);

ALTER TABLE public.material_pricing DROP CONSTRAINT IF EXISTS material_pricing_scope_key_key;
ALTER TABLE public.material_pricing ADD CONSTRAINT material_pricing_tenant_scope_key_key UNIQUE (tenant_id, scope, key);

ALTER TABLE public.material_room_pricing DROP CONSTRAINT IF EXISTS material_room_pricing_material_key_room_key_category_key_key;
ALTER TABLE public.material_room_pricing ADD CONSTRAINT material_room_pricing_tenant_keys_key UNIQUE (tenant_id, material_key, room_key, category_key);


-- ==========================================
-- Migration File: 20260430124846_7d691159-9d10-440c-b277-1788b2b14a99.sql
-- ==========================================

create table if not exists public.playbook_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing-playbooks',
  user_agent text,
  created_at timestamptz not null default now()
);

create unique index if not exists playbook_subscribers_email_lower_idx
  on public.playbook_subscribers (lower(email));



-- ==========================================
-- Migration File: 20260430182742_6a027e55-f7ec-45f9-8632-a043fb7fbca1.sql
-- ==========================================

-- Extend playbook_subscribers with mobile + verification status
ALTER TABLE public.playbook_subscribers
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Allow public UPDATE only on verified flag flip via edge function (service role bypasses RLS).
-- We don't add a public UPDATE policy; edge functions use service role.

-- New: OTP verification table
CREATE TABLE IF NOT EXISTS public.playbook_otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL,
  mobile text,
  otp_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  verified_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playbook_otp_email_idx
  ON public.playbook_otp_verifications (lower(email), created_at DESC);
CREATE INDEX IF NOT EXISTS playbook_otp_ip_idx
  ON public.playbook_otp_verifications (ip, created_at DESC);

-- No public read — only admins can see verification rows

-- Cleanup helper for expired/old OTP rows (callable from cron later)
CREATE OR REPLACE FUNCTION public.cleanup_playbook_otps()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_deleted int;
BEGIN
  DELETE FROM public.playbook_otp_verifications
    WHERE created_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ==========================================
-- Migration File: 20260430182904_486b4b43-8294-4ee5-a9c1-ee210c3b5127.sql
-- ==========================================

-- Deduplicate any existing rows by lowercased email, keeping the earliest
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY created_at) AS rn
  FROM public.playbook_subscribers
)
DELETE FROM public.playbook_subscribers
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.playbook_subscribers
  ADD CONSTRAINT playbook_subscribers_email_unique UNIQUE (email);

