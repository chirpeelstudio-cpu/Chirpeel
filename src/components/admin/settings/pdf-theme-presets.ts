import type { PdfTheme } from "@/hooks/usePdfTheme";

export type PresetValues = Omit<PdfTheme, "logo_url" | "bank_details_text" | "terms_text">;

export interface PdfThemePreset {
  id: string;
  name: string;
  description: string;
  swatch: string[];
  values: PresetValues;
}

const baseToggles = {
  show_brand_strip: true,
  show_trust_strip: true,
  show_signature_block: true,
  show_terms_block: true,
  watermark_text: "",
  watermark_opacity: 0.08,
} as const;

export const PDF_THEME_PRESETS: PdfThemePreset[] = [
  {
    id: "classic-blue",
    name: "Classic Blue",
    description: "Trusted, corporate look — our default.",
    swatch: ["#0F2C5F", "#1E40AF", "#E0E7FF"],
    values: {
      header_color: "#0F2C5F",
      accent_color: "#0F2C5F",
      logo_size: "md",
      heading_font: "Playfair Display",
      body_font: "Inter",
      base_font_size: "normal",
      logo_position: "left",
      accent_style: "bar",
      table_style: "striped",
      ...baseToggles,
      quotation_footer_note:
        "Thank you for choosing us — this is a computer-generated quotation.",
      invoice_footer_note:
        "Thank you for your business. Please make payment by the due date.",
    },
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean, lots of whitespace, no fuss.",
    swatch: ["#111827", "#6B7280", "#F3F4F6"],
    values: {
      header_color: "#111827",
      accent_color: "#111827",
      logo_size: "sm",
      heading_font: "Inter",
      body_font: "Inter",
      base_font_size: "normal",
      logo_position: "left",
      accent_style: "none",
      table_style: "minimal",
      ...baseToggles,
      show_brand_strip: false,
      show_trust_strip: false,
      quotation_footer_note: "Thank you. Reply to confirm and we'll begin.",
      invoice_footer_note: "Please remit payment by the due date. Thank you.",
    },
  },
  {
    id: "luxe-gold",
    name: "Luxe Gold",
    description: "Premium feel for high-ticket interiors.",
    swatch: ["#1F1B16", "#B8860B", "#F5E6C8"],
    values: {
      header_color: "#1F1B16",
      accent_color: "#B8860B",
      logo_size: "lg",
      heading_font: "Playfair Display",
      body_font: "Lora",
      base_font_size: "normal",
      logo_position: "center",
      accent_style: "underline",
      table_style: "bordered",
      ...baseToggles,
      quotation_footer_note:
        "Crafted for you. We look forward to bringing this home to life.",
      invoice_footer_note:
        "It is our pleasure to serve you. Kindly settle by the due date.",
    },
  },
  {
    id: "architect-mono",
    name: "Architect Mono",
    description: "Studio / blueprint vibe, structured.",
    swatch: ["#0B1220", "#1E293B", "#CBD5E1"],
    values: {
      header_color: "#0B1220",
      accent_color: "#1E293B",
      logo_size: "md",
      heading_font: "DM Sans",
      body_font: "DM Sans",
      base_font_size: "compact",
      logo_position: "left",
      accent_style: "bar",
      table_style: "bordered",
      ...baseToggles,
      quotation_footer_note:
        "All measurements are indicative; final dims confirmed at site survey.",
      invoice_footer_note: "Tax invoice — please retain for your records.",
    },
  },
  {
    id: "warm-earth",
    name: "Warm Earth",
    description: "Approachable, residential, friendly.",
    swatch: ["#3E2723", "#A0522D", "#FAE3C6"],
    values: {
      header_color: "#3E2723",
      accent_color: "#A0522D",
      logo_size: "md",
      heading_font: "Merriweather",
      body_font: "Inter",
      base_font_size: "normal",
      logo_position: "left",
      accent_style: "bar",
      table_style: "striped",
      ...baseToggles,
      quotation_footer_note:
        "We can't wait to make your home beautiful — talk soon!",
      invoice_footer_note:
        "Thanks so much for your trust — please pay by the due date.",
    },
  },
  {
    id: "bold-crimson",
    name: "Bold Crimson",
    description: "High-energy, sales-led, eye-catching.",
    swatch: ["#7F1D1D", "#B91C1C", "#FECACA"],
    values: {
      header_color: "#7F1D1D",
      accent_color: "#B91C1C",
      logo_size: "md",
      heading_font: "Poppins",
      body_font: "Inter",
      base_font_size: "normal",
      logo_position: "center",
      accent_style: "bar",
      table_style: "striped",
      ...baseToggles,
      quotation_footer_note:
        "Limited slots this month — confirm soon to lock in your timeline.",
      invoice_footer_note: "Pay by the due date to keep your project on track.",
    },
  },
];

const KEY_FIELDS: (keyof PresetValues)[] = [
  "header_color",
  "accent_color",
  "heading_font",
  "body_font",
  "accent_style",
  "table_style",
  "logo_position",
  "base_font_size",
];

export function detectActivePreset(theme: PdfTheme): string | null {
  const t = theme as unknown as Record<string, unknown>;
  for (const preset of PDF_THEME_PRESETS) {
    const v = preset.values as unknown as Record<string, unknown>;
    const match = KEY_FIELDS.every(
      (k) => v[k as string] === t[k as string],
    );
    if (match) return preset.id;
  }
  return null;
}

export const ALL_PRESET_FONTS = Array.from(
  new Set(PDF_THEME_PRESETS.flatMap((p) => [p.values.heading_font, p.values.body_font])),
);