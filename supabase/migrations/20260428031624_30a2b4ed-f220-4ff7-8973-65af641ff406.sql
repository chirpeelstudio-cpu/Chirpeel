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