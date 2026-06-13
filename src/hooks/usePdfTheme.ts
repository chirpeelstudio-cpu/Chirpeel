import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PdfTheme {
  // Brand (already in company_settings)
  header_color: string;
  accent_color: string;
  logo_url: string | null;
  logo_size: "sm" | "md" | "lg" | "xl";
  // New
  heading_font: string;
  body_font: string;
  base_font_size: "compact" | "normal" | "large";
  logo_position: "left" | "center";
  accent_style: "bar" | "underline" | "none";
  table_style: "striped" | "bordered" | "minimal";
  show_brand_strip: boolean;
  show_trust_strip: boolean;
  show_signature_block: boolean;
  show_terms_block: boolean;
  watermark_text: string;
  watermark_opacity: number;
  quotation_footer_note: string;
  invoice_footer_note: string;
  terms_text: string;
  bank_details_text: string;
}

export const DEFAULT_PDF_THEME: PdfTheme = {
  header_color: "#0F2C5F",
  accent_color: "#0F2C5F",
  logo_url: null,
  logo_size: "md",
  heading_font: "Playfair Display",
  body_font: "Inter",
  base_font_size: "normal",
  logo_position: "left",
  accent_style: "bar",
  table_style: "striped",
  show_brand_strip: true,
  show_trust_strip: true,
  show_signature_block: true,
  show_terms_block: true,
  watermark_text: "",
  watermark_opacity: 0.08,
  quotation_footer_note: "Thank you for choosing us — this is a computer-generated quotation.",
  invoice_footer_note: "Thank you for your business. Please make payment by the due date.",
  terms_text:
    "1. Quotation valid for 15 days.\n2. 10% advance to confirm order, 50% before production, 40% before installation.\n3. Civil, plumbing & electrical changes are not included.\n4. GST extra as applicable.",
  bank_details_text: "Account Name: \nAccount No: \nIFSC: \nBank: \nUPI: ",
};

export const FONT_OPTIONS = [
  "Inter",
  "Playfair Display",
  "DM Sans",
  "Roboto",
  "Lora",
  "Merriweather",
  "Poppins",
] as const;

export const BASE_FONT_PX: Record<PdfTheme["base_font_size"], number> = {
  compact: 12,
  normal: 14,
  large: 16,
};

export const LOGO_PX: Record<PdfTheme["logo_size"], number> = {
  sm: 48,
  md: 72,
  lg: 96,
  xl: 128,
};

const mergeWithDefaults = (raw: Partial<PdfTheme> | null | undefined): PdfTheme => ({
  ...DEFAULT_PDF_THEME,
  ...Object.fromEntries(
    Object.entries(raw ?? {}).filter(([, v]) => v !== null && v !== undefined),
  ),
}) as PdfTheme;

interface UsePdfThemeOptions {
  /** When false, hook only reads — no settings row creation on save. */
  autoCreate?: boolean;
}

export function usePdfTheme(_opts: UsePdfThemeOptions = {}) {
  const [rowId, setRowId] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<PdfTheme>(DEFAULT_PDF_THEME);
  const [draft, setDraft] = useState<PdfTheme>(DEFAULT_PDF_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("company_settings" as never)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const row = data as unknown as Partial<PdfTheme> & { id?: string };
        setRowId(row.id ?? null);
        const merged = mergeWithDefaults(row);
        setPersisted(merged);
        setDraft(merged);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(<K extends keyof PdfTheme>(key: K, value: PdfTheme[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setDraft(persisted), [persisted]);
  const resetToDefaults = useCallback(() => setDraft(DEFAULT_PDF_THEME), []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...draft };
      let res;
      if (rowId) {
        res = await supabase
          .from("company_settings" as never)
          .update(payload as never)
          .eq("id" as never, rowId as never);
      } else {
        // Should not normally happen — CompanyBranding seeds the row.
        res = await supabase
          .from("company_settings" as never)
          .insert(payload as never);
      }
      if (res.error) throw res.error;
      setPersisted(draft);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e as Error };
    } finally {
      setSaving(false);
    }
  }, [draft, rowId]);

  const dirty = useMemo(
    () => JSON.stringify(persisted) !== JSON.stringify(draft),
    [persisted, draft],
  );

  return { theme: draft, persisted, update, reset, resetToDefaults, save, loading, saving, dirty };
}
