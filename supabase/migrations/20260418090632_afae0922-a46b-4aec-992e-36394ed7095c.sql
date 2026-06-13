
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

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view company settings"
  ON public.company_settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert company settings"
  ON public.company_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update company settings"
  ON public.company_settings FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER set_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial row
INSERT INTO public.company_settings DEFAULT VALUES;

-- Storage bucket for logos & branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read company assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated can upload company assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Authenticated can update company assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated can delete company assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets');
