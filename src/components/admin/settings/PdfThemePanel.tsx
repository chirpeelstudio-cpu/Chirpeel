import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  BASE_FONT_PX,
  DEFAULT_PDF_THEME,
  FONT_OPTIONS,
  LOGO_PX,
  type PdfTheme,
  usePdfTheme,
} from "@/hooks/usePdfTheme";
import { Loader2, RotateCcw, Save, FileText, Receipt } from "lucide-react";
import PdfThemeGallery from "./PdfThemeGallery";
import type { PdfThemePreset } from "./pdf-theme-presets";

type DocKind = "quotation" | "invoice";

const SAMPLE_QUOTE = {
  number: "QT-2026-0042",
  date: "28 Apr 2026",
  customer: "Mr. Karthik Subramanian",
  address: "12, Avinashi Road, Tirupur, Tamil Nadu 641603",
  rooms: [
    {
      name: "Modular Kitchen — L-Shape",
      sqft: 84,
      items: [
        { label: "Base units (BWP ply, acrylic)", qty: 1, rate: 1850, amount: 155400 },
        { label: "Wall units with lift-up shutters", qty: 1, rate: 1650, amount: 92400 },
        { label: "Tall unit + tandem pull-out", qty: 1, rate: 65000, amount: 65000 },
      ],
      total: 312800,
    },
    {
      name: "Master Bedroom Wardrobe",
      sqft: 56,
      items: [
        { label: "8ft sliding wardrobe (laminate)", qty: 1, rate: 1450, amount: 81200 },
        { label: "LED profile lighting", qty: 1, rate: 8500, amount: 8500 },
      ],
      total: 89700,
    },
  ],
  subtotal: 402500,
  gst: 72450,
  total: 474950,
};

const SAMPLE_INVOICE = {
  number: "INV-2026-0117",
  date: "28 Apr 2026",
  due: "12 May 2026",
  customer: "Mr. Karthik Subramanian",
  items: [
    { label: "Modular kitchen — milestone 2 (production)", qty: 1, rate: 156400, amount: 156400 },
    { label: "Wardrobe — milestone 1 (advance)", qty: 1, rate: 22425, amount: 22425 },
    { label: "Site supervision charges", qty: 1, rate: 5000, amount: 5000 },
  ],
  subtotal: 183825,
  gst: 33089,
  total: 216914,
};

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

/* ────────────────────────────────────────────────────────────────────────── */
/* Live sample preview                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export const ThemedDocument = ({ theme, kind }: { theme: PdfTheme; kind: DocKind }) => {
  const accent = theme.accent_color || DEFAULT_PDF_THEME.accent_color;
  const headerColor = theme.header_color || DEFAULT_PDF_THEME.header_color;
  const baseFontPx = BASE_FONT_PX[theme.base_font_size];
  const logoPx = LOGO_PX[theme.logo_size];

  const docStyle: React.CSSProperties = {
    fontFamily: `"${theme.body_font}", system-ui, sans-serif`,
    fontSize: baseFontPx,
    color: "#222",
    background: "#fff",
  };
  const headingStyle: React.CSSProperties = {
    fontFamily: `"${theme.heading_font}", Georgia, serif`,
    color: headerColor,
  };

  const accentBar =
    theme.accent_style === "bar" ? (
      <div className="w-full h-2 rounded-sm mb-4" style={{ background: accent }} />
    ) : null;
  const accentUnderline =
    theme.accent_style === "underline"
      ? { borderBottom: `2px solid ${accent}`, paddingBottom: 8 }
      : {};

  const tableClasses =
    theme.table_style === "bordered"
      ? "border border-border [&_th]:border [&_td]:border [&_th]:border-border [&_td]:border-border"
      : theme.table_style === "minimal"
      ? "[&_tbody_tr]:border-b [&_tbody_tr]:border-border/40"
      : "[&_tbody_tr:nth-child(odd)]:bg-muted/30";

  const headerBlock = (
    <div
      className={`flex gap-4 ${
        theme.logo_position === "center" ? "flex-col items-center text-center" : "items-start justify-between"
      }`}
      style={accentUnderline}
    >
      <div className={`flex gap-3 ${theme.logo_position === "center" ? "flex-col items-center" : "items-start"}`}>
        {theme.logo_url ? (
          <img
            src={theme.logo_url}
            alt="Logo"
            style={{ width: logoPx, height: logoPx, objectFit: "contain" }}
          />
        ) : (
          <div
            className="rounded-md flex items-center justify-center text-white font-bold"
            style={{ width: logoPx, height: logoPx, background: accent, fontSize: logoPx / 3 }}
          >
            HC
          </div>
        )}
        <div className={theme.logo_position === "center" ? "" : "min-w-0"}>
          <h1 className="leading-tight font-bold" style={{ ...headingStyle, fontSize: baseFontPx * 1.7 }}>
            Chirpeel Interiors
          </h1>
          <p className="text-xs text-muted-foreground">Modular kitchens & complete home interiors</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            SF 392/1, Nehru Street, Tirumuruganpoondi, Tirupur 641652 · +91 95858 96733
          </p>
        </div>
      </div>
      {theme.logo_position === "left" && (
        <div className="text-right shrink-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {kind === "quotation" ? "Quotation" : "Tax Invoice"}
          </div>
          <div className="font-bold" style={{ color: accent, fontSize: baseFontPx * 1.1 }}>
            {kind === "quotation" ? SAMPLE_QUOTE.number : SAMPLE_INVOICE.number}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Date: {kind === "quotation" ? SAMPLE_QUOTE.date : SAMPLE_INVOICE.date}
          </div>
          {kind === "invoice" && (
            <div className="text-xs text-muted-foreground">Due: {SAMPLE_INVOICE.due}</div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative overflow-hidden" style={docStyle}>
      {/* Watermark */}
      {theme.watermark_text && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
          style={{
            transform: "rotate(-30deg)",
            color: accent,
            opacity: theme.watermark_opacity,
            fontFamily: `"${theme.heading_font}", serif`,
            fontSize: baseFontPx * 7,
            fontWeight: 700,
            letterSpacing: "0.1em",
            zIndex: 0,
          }}
        >
          {theme.watermark_text}
        </div>
      )}

      <div className="relative z-10 p-6 sm:p-8">
        {accentBar}
        {headerBlock}

        {/* Bill-to */}
        <div className="grid grid-cols-2 gap-4 mt-5 pb-3" style={{ fontSize: baseFontPx * 0.9 }}>
          <div>
            <div className="uppercase text-[10px] tracking-wider text-muted-foreground">Bill To</div>
            <div className="font-semibold mt-1" style={{ color: headerColor }}>
              {kind === "quotation" ? SAMPLE_QUOTE.customer : SAMPLE_INVOICE.customer}
            </div>
            <div className="text-muted-foreground">
              {kind === "quotation" ? SAMPLE_QUOTE.address : "Tirupur, Tamil Nadu"}
            </div>
          </div>
          {theme.show_brand_strip && (
            <div className="text-right">
              <div className="uppercase text-[10px] tracking-wider text-muted-foreground">Brand Partners</div>
              <div className="text-xs mt-1 text-muted-foreground">
                Hettich · Hafele · Blum · Greenply · Asian Paints
              </div>
            </div>
          )}
        </div>

        {/* Content table */}
        {kind === "quotation" ? (
          <div className="space-y-3 mt-2">
            {SAMPLE_QUOTE.rooms.map((r, i) => (
              <div key={i} className="rounded-md overflow-hidden border border-border">
                <div
                  className="flex items-center justify-between px-3 py-2"
                  style={{ background: accent + "12", color: headerColor }}
                >
                  <div className="font-semibold" style={{ fontSize: baseFontPx * 0.95 }}>
                    {i + 1}. {r.name} · <span className="font-normal text-muted-foreground">{r.sqft} sqft</span>
                  </div>
                  <div className="font-bold" style={{ color: accent }}>{formatINR(r.total)}</div>
                </div>
                <table className={`w-full ${tableClasses}`} style={{ fontSize: baseFontPx * 0.82 }}>
                  <thead style={{ background: "#fafafa", color: "#666" }}>
                    <tr>
                      <th className="text-left py-1.5 px-3">Item</th>
                      <th className="text-right py-1.5 px-2">Qty</th>
                      <th className="text-right py-1.5 px-2">Rate</th>
                      <th className="text-right py-1.5 px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.items.map((it, j) => (
                      <tr key={j}>
                        <td className="py-1.5 px-3">{it.label}</td>
                        <td className="py-1.5 px-2 text-right">{it.qty}</td>
                        <td className="py-1.5 px-2 text-right">{formatINR(it.rate)}</td>
                        <td className="py-1.5 px-3 text-right font-medium">{formatINR(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <table className={`w-full mt-2 rounded-md overflow-hidden ${tableClasses}`} style={{ fontSize: baseFontPx * 0.85 }}>
            <thead style={{ background: accent + "12", color: headerColor }}>
              <tr>
                <th className="text-left py-2 px-3">Description</th>
                <th className="text-right py-2 px-2">Qty</th>
                <th className="text-right py-2 px-2">Rate</th>
                <th className="text-right py-2 px-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_INVOICE.items.map((it, j) => (
                <tr key={j}>
                  <td className="py-2 px-3">{it.label}</td>
                  <td className="py-2 px-2 text-right">{it.qty}</td>
                  <td className="py-2 px-2 text-right">{formatINR(it.rate)}</td>
                  <td className="py-2 px-3 text-right font-medium">{formatINR(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totals */}
        <div className="flex justify-end mt-4">
          <div className="w-64 space-y-1" style={{ fontSize: baseFontPx * 0.9 }}>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatINR(kind === "quotation" ? SAMPLE_QUOTE.subtotal : SAMPLE_INVOICE.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST 18%</span>
              <span>{formatINR(kind === "quotation" ? SAMPLE_QUOTE.gst : SAMPLE_INVOICE.gst)}</span>
            </div>
            <div
              className="flex justify-between pt-1 mt-1 font-bold"
              style={{ borderTop: `1px solid ${accent}`, color: headerColor, fontSize: baseFontPx }}
            >
              <span>Total</span>
              <span style={{ color: accent }}>
                {formatINR(kind === "quotation" ? SAMPLE_QUOTE.total : SAMPLE_INVOICE.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Bank details (invoice only) */}
        {kind === "invoice" && theme.bank_details_text?.trim() && (
          <div className="mt-5 p-3 rounded-md" style={{ background: accent + "08", border: `1px solid ${accent}33` }}>
            <div className="font-semibold mb-1" style={{ color: headerColor, fontSize: baseFontPx * 0.85 }}>
              Bank Details
            </div>
            <pre className="whitespace-pre-wrap font-sans text-muted-foreground" style={{ fontSize: baseFontPx * 0.78 }}>
              {theme.bank_details_text}
            </pre>
          </div>
        )}

        {/* Terms */}
        {theme.show_terms_block && theme.terms_text?.trim() && (
          <div className="mt-5">
            <div className="font-semibold mb-1" style={{ color: headerColor, fontSize: baseFontPx * 0.9 }}>
              Terms &amp; Conditions
            </div>
            <pre className="whitespace-pre-wrap font-sans text-muted-foreground" style={{ fontSize: baseFontPx * 0.78 }}>
              {theme.terms_text}
            </pre>
          </div>
        )}

        {/* Signature */}
        {theme.show_signature_block && (
          <div className="mt-8 grid grid-cols-2 gap-8" style={{ fontSize: baseFontPx * 0.85 }}>
            <div>
              <div className="border-t border-border pt-1 text-center text-muted-foreground">Customer Signature</div>
            </div>
            <div>
              <div className="border-t border-border pt-1 text-center text-muted-foreground">
                For Chirpeel Interiors
              </div>
            </div>
          </div>
        )}

        {/* Trust strip */}
        {theme.show_trust_strip && (
          <div
            className="mt-6 grid grid-cols-3 gap-3 rounded-md p-3 text-center"
            style={{ background: accent + "08" }}
          >
            {[
              { t: "10-Year", s: "Warranty" },
              { t: "45-Day", s: "Delivery" },
              { t: "0", s: "Hidden Costs" },
            ].map((b) => (
              <div key={b.t}>
                <div className="font-bold" style={{ color: accent, fontSize: baseFontPx * 1 }}>
                  {b.t}
                </div>
                <div className="text-muted-foreground" style={{ fontSize: baseFontPx * 0.7 }}>
                  {b.s}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          className="mt-6 pt-3 text-center text-muted-foreground"
          style={{ borderTop: `1px solid ${accent}22`, fontSize: baseFontPx * 0.72 }}
        >
          {kind === "quotation" ? theme.quotation_footer_note : theme.invoice_footer_note}
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Editor                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export default function PdfThemePanel() {
  const { theme, update, save, reset, resetToDefaults, dirty, loading, saving } = usePdfTheme();
  const [docKind, setDocKind] = useState<DocKind>("quotation");

  const applyPreset = (preset: PdfThemePreset) => {
    (Object.keys(preset.values) as (keyof typeof preset.values)[]).forEach((k) => {
      update(k as never, preset.values[k] as never);
    });
    toast.info(`Theme "${preset.name}" applied — click Save to persist.`);
  };

  const fontLinkHref = useMemo(() => {
    const fonts = new Set<string>([theme.heading_font, theme.body_font]);
    const families = Array.from(fonts)
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;700`)
      .join("&");
    return `https://fonts.googleapis.com/css2?${families}&display=swap`;
  }, [theme.heading_font, theme.body_font]);

  const handleSave = async () => {
    const res = await save();
    if (res.ok) toast.success("PDF theme saved");
    else toast.error(res.error?.message ?? "Failed to save PDF theme");
  };

  if (loading) {
    return (
      <Card className="p-12 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading theme…
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Inject the chosen Google Fonts so the live preview actually uses them */}
      <link rel="stylesheet" href={fontLinkHref} />

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">PDF Theme Editor</h2>
          <p className="text-sm text-muted-foreground">
            Customize how your quotation and invoice PDFs look. Changes apply to every new document.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Reset to defaults
          </Button>
          <Button variant="outline" size="sm" onClick={reset} disabled={!dirty || saving}>
            Discard changes
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save theme
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-4">
        {/* ───────── Controls ───────── */}
        <div className="space-y-3">
          {/* Theme gallery */}
          <PdfThemeGallery currentTheme={theme} onApply={applyPreset} />

          {/* Brand colors */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Brand colors</h3>
            <div className="grid grid-cols-2 gap-3">
              <ColorField
                label="Accent"
                value={theme.accent_color}
                onChange={(v) => update("accent_color", v)}
              />
              <ColorField
                label="Heading"
                value={theme.header_color}
                onChange={(v) => update("header_color", v)}
              />
            </div>
          </Card>

          {/* Logo */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Logo</h3>
            <div>
              <Label className="text-xs">Logo URL</Label>
              <Input
                value={theme.logo_url ?? ""}
                onChange={(e) => update("logo_url", e.target.value || null)}
                placeholder="Upload via Company tab, then paste URL here"
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Tip: upload your logo on the <strong>Company</strong> tab — the URL will appear here automatically.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Size"
                value={theme.logo_size}
                onChange={(v) => update("logo_size", v as PdfTheme["logo_size"])}
                options={[
                  { value: "sm", label: "Small" },
                  { value: "md", label: "Medium" },
                  { value: "lg", label: "Large" },
                  { value: "xl", label: "Extra large" },
                ]}
              />
              <SelectField
                label="Position"
                value={theme.logo_position}
                onChange={(v) => update("logo_position", v as PdfTheme["logo_position"])}
                options={[
                  { value: "left", label: "Left" },
                  { value: "center", label: "Centered" },
                ]}
              />
            </div>
          </Card>

          {/* Typography */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Typography</h3>
            <SelectField
              label="Heading font"
              value={theme.heading_font}
              onChange={(v) => update("heading_font", v)}
              options={FONT_OPTIONS.map((f) => ({ value: f, label: f }))}
            />
            <SelectField
              label="Body font"
              value={theme.body_font}
              onChange={(v) => update("body_font", v)}
              options={FONT_OPTIONS.map((f) => ({ value: f, label: f }))}
            />
            <SelectField
              label="Base size"
              value={theme.base_font_size}
              onChange={(v) => update("base_font_size", v as PdfTheme["base_font_size"])}
              options={[
                { value: "compact", label: "Compact" },
                { value: "normal", label: "Normal" },
                { value: "large", label: "Large" },
              ]}
            />
          </Card>

          {/* Layout */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Layout</h3>
            <SelectField
              label="Accent style"
              value={theme.accent_style}
              onChange={(v) => update("accent_style", v as PdfTheme["accent_style"])}
              options={[
                { value: "bar", label: "Solid bar" },
                { value: "underline", label: "Thin underline" },
                { value: "none", label: "None" },
              ]}
            />
            <SelectField
              label="Table style"
              value={theme.table_style}
              onChange={(v) => update("table_style", v as PdfTheme["table_style"])}
              options={[
                { value: "striped", label: "Striped" },
                { value: "bordered", label: "Bordered" },
                { value: "minimal", label: "Minimal" },
              ]}
            />

            <ToggleRow
              label="Show brand-partner strip"
              checked={theme.show_brand_strip}
              onChange={(v) => update("show_brand_strip", v)}
            />
            <ToggleRow
              label="Show trust badges (warranty, delivery…)"
              checked={theme.show_trust_strip}
              onChange={(v) => update("show_trust_strip", v)}
            />
            <ToggleRow
              label="Show signature block"
              checked={theme.show_signature_block}
              onChange={(v) => update("show_signature_block", v)}
            />
            <ToggleRow
              label="Show terms & conditions"
              checked={theme.show_terms_block}
              onChange={(v) => update("show_terms_block", v)}
            />
          </Card>

          {/* Watermark */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Watermark</h3>
            <div>
              <Label className="text-xs">Text (leave empty to disable)</Label>
              <Input
                value={theme.watermark_text}
                onChange={(e) => update("watermark_text", e.target.value)}
                placeholder='e.g. "DRAFT" or "PAID"'
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs">
                <Label className="text-xs">Opacity</Label>
                <span className="text-muted-foreground tabular-nums">
                  {Math.round(theme.watermark_opacity * 100)}%
                </span>
              </div>
              <Slider
                className="mt-2"
                value={[theme.watermark_opacity]}
                min={0}
                max={0.4}
                step={0.01}
                onValueChange={(v) => update("watermark_opacity", v[0] ?? 0.08)}
              />
            </div>
          </Card>

          {/* Document text */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Document text</h3>
            <div>
              <Label className="text-xs">Quotation footer note</Label>
              <Textarea
                rows={2}
                value={theme.quotation_footer_note}
                onChange={(e) => update("quotation_footer_note", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Invoice footer note</Label>
              <Textarea
                rows={2}
                value={theme.invoice_footer_note}
                onChange={(e) => update("invoice_footer_note", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Terms &amp; conditions</Label>
              <Textarea
                rows={5}
                value={theme.terms_text}
                onChange={(e) => update("terms_text", e.target.value)}
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Bank details (invoice only)</Label>
              <Textarea
                rows={5}
                value={theme.bank_details_text}
                onChange={(e) => update("bank_details_text", e.target.value)}
                className="mt-1 font-mono text-xs"
              />
            </div>
          </Card>
        </div>

        {/* ───────── Preview ───────── */}
        <div className="lg:sticky lg:top-4 self-start">
          <Card className="p-3 bg-muted/40">
            <Tabs value={docKind} onValueChange={(v) => setDocKind(v as DocKind)}>
              <div className="flex items-center justify-between mb-3">
                <TabsList>
                  <TabsTrigger value="quotation">
                    <FileText className="w-4 h-4 mr-1.5" /> Quotation
                  </TabsTrigger>
                  <TabsTrigger value="invoice">
                    <Receipt className="w-4 h-4 mr-1.5" /> Invoice
                  </TabsTrigger>
                </TabsList>
                <span className="text-[11px] text-muted-foreground">A4 preview · sample data</span>
              </div>
            </Tabs>
            <div className="bg-background rounded-md shadow-inner overflow-hidden">
              <div
                className="mx-auto bg-white shadow-md overflow-hidden border"
                style={{ width: "100%", maxWidth: 720, aspectRatio: "1 / 1.414" }}
              >
                <div className="w-full h-full overflow-y-auto">
                  <ThemedDocument theme={theme} kind={docKind} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Small field components                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <div className="mt-1 flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded-md border border-input bg-background cursor-pointer"
        aria-label={`${label} color`}
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
    </div>
  </div>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const ToggleRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-3">
    <Label className="text-xs">{label}</Label>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);
