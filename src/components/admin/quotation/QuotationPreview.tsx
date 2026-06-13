import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// Brand-specific assets removed during white-label cleanup; using empty placeholders.
const logo = "";
const warrantyBadge = "";
const deliveryBadge = "";
const noHiddenCostBadge = "";
const onTimeDeliveryBadge = "";
const afterSalesBadge = "";
const endToEndBadge = "";
import { formatINR, type Quotation, type QuotationRoom } from "./types";
import { BRAND_GROUPS, BRAND_CATEGORY_LABEL, parseBrandCsv, findBrand, LEGACY_BRAND_CATEGORIES, type BrandCategory } from "./brands";

interface CompanyBrand {
  company_name: string;
  tagline: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  gstin: string | null;
  logo_url: string | null;
  logo_size: string;
  header_color: string;
  accent_color: string;
  footer_note: string | null;
}

const LOGO_PX: Record<string, number> = { sm: 48, md: 72, lg: 96, xl: 128 };

interface QuotationPreviewProps {
  quotation: Quotation;
  rooms: QuotationRoom[];
}

const Header = ({ q, brand }: { q: Quotation; brand: CompanyBrand | null }) => {
  const logoSrc = brand?.logo_url || logo;
  const logoPx = LOGO_PX[brand?.logo_size ?? "md"] ?? 72;
  const accent = brand?.accent_color ?? "hsl(var(--primary))";
  const header = brand?.header_color ?? "hsl(var(--foreground))";
  const cityLine = [brand?.city, brand?.state, brand?.pincode].filter(Boolean).join(", ");

  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: accent + "33" }}>
      <div className="flex items-start gap-4 min-w-0">
        <img src={logoSrc} alt={brand?.company_name ?? "Logo"} style={{ height: logoPx, width: logoPx }} className="object-contain shrink-0" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: header }}>{brand?.company_name ?? "Homycube Interiors"}</h1>
          {brand?.tagline && <p className="text-xs text-muted-foreground">{brand.tagline}</p>}
          <div className="text-[11px] text-foreground/80 mt-2 space-y-0.5">
            {brand?.address_line1 && <div>{brand.address_line1}</div>}
            {brand?.address_line2 && <div>{brand.address_line2}</div>}
            {cityLine && <div>{cityLine}</div>}
            <div className="pt-1">
              {brand?.phone && <span>📞 {brand.phone}</span>}
              {brand?.whatsapp && brand.whatsapp !== brand.phone && <span> · WhatsApp {brand.whatsapp}</span>}
            </div>
            {brand?.email && <div>✉ {brand.email}</div>}
            {brand?.website && <div>🌐 {brand.website}</div>}
            {brand?.gstin && <div className="font-medium">GSTIN: {brand.gstin}</div>}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-muted-foreground">Quotation</div>
        <div className="font-bold" style={{ color: accent }}>{q.quotation_number ?? "DRAFT"}</div>
        <div className="text-xs text-muted-foreground mt-1">Date: {q.quotation_date}</div>
        <div className="text-xs text-muted-foreground">Valid {q.validity_days} days</div>
      </div>
    </div>
  );
};

const CustomerBlock = ({ q }: { q: Quotation }) => (
  <div className="grid grid-cols-2 gap-4 py-4 text-sm">
    <div>
      <div className="text-xs uppercase text-muted-foreground mb-1">Bill To</div>
      <div className="font-semibold">{q.customer_name}</div>
      <div className="text-muted-foreground">{q.customer_phone}</div>
      {q.customer_email && <div className="text-muted-foreground">{q.customer_email}</div>}
      {q.customer_address && <div className="text-muted-foreground whitespace-pre-line">{q.customer_address}</div>}
      {q.project_location && <div className="text-muted-foreground">{q.project_location}</div>}
    </div>
    <div>
      <div className="text-xs uppercase text-muted-foreground mb-1">Project</div>
      {q.project_name && <div className="font-semibold">{q.project_name}</div>}
      {q.project_type && <div className="text-muted-foreground">{q.project_type}</div>}
      {q.sales_person && <div className="text-muted-foreground">Sales: {q.sales_person}</div>}
    </div>
  </div>
);

const Totals = ({ q }: { q: Quotation }) => (
  <div className="ml-auto w-full sm:w-72 text-sm space-y-1 mt-4">
    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(q.subtotal)}</span></div>
    {q.discount_amount > 0 && (
      <div className="flex justify-between text-destructive"><span>Discount</span><span>− {formatINR(q.discount_amount)}</span></div>
    )}
    {q.gst_enabled && (
      <div className="flex justify-between"><span className="text-muted-foreground">GST ({q.gst_rate}%)</span><span>{formatINR(q.gst_amount)}</span></div>
    )}
    <div className="flex justify-between border-t border-border pt-2 mt-2 font-bold text-base">
      <span>Grand Total</span><span className="text-primary">{formatINR(q.total_amount)}</span>
    </div>
  </div>
);

const BrandsStrip = ({ quotation, accent }: { quotation: Quotation; accent: string }) => {
  // Build per-group list of { categoryLabel, brandOptions }
  const getValueForCat = (cat: BrandCategory) => {
    if (cat === "hardware") return parseBrandCsv(cat, quotation.hardware_brand);
    if (cat === "core_material") return parseBrandCsv(cat, quotation.core_material_brand);
    if (cat === "laminate") return parseBrandCsv(cat, quotation.laminate_brand);
    const id = quotation.brand_selections?.[cat] ?? null;
    const b = findBrand(cat, id);
    return b ? [b] : [];
  };

  const groups = BRAND_GROUPS.map((g) => ({
    label: g.label,
    rows: g.categories
      .map((cat) => ({ cat, label: BRAND_CATEGORY_LABEL[cat], brands: getValueForCat(cat) }))
      .filter((r) => r.brands.length > 0),
  })).filter((g) => g.rows.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="rounded-md border p-3 mb-2" style={{ borderColor: accent + "33", background: accent + "08" }}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-3 font-semibold">Brands Used in This Project</div>
      <div className={`grid gap-4 ${groups.length === 1 ? "grid-cols-1" : groups.length === 2 ? "grid-cols-2" : groups.length === 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <div className="text-[10px] uppercase font-bold tracking-wider text-center pb-1 border-b" style={{ color: accent, borderColor: accent + "55" }}>{group.label}</div>
            <div className="flex flex-col gap-2">
              {group.rows.map((row) => (
                <div key={row.cat} className="flex flex-col gap-1">
                  <div className="text-[9px] uppercase text-muted-foreground tracking-wide text-center">{row.label}</div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {row.brands.map((b) => (
                      <div key={b.id} className="flex items-center gap-1.5 bg-white rounded border border-border px-2 py-1">
                        {b.logo ? (
                          <div className="h-6 w-10 flex items-center justify-center">
                            <img src={b.logo} alt={b.name} className="max-h-6 max-w-full object-contain" />
                          </div>
                        ) : null}
                        <span className="text-[10px] font-medium">{b.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TRUST_TILES: Array<{ big: string; sub: string; caption: string; image?: string }> = [
  { big: "10", sub: "years", caption: "WARRANTY", image: warrantyBadge },
  { big: "45", sub: "days", caption: "DELIVERY", image: deliveryBadge },
  { big: "NO", sub: "hidden", caption: "COST", image: noHiddenCostBadge },
  { big: "ON", sub: "time", caption: "DELIVERY", image: onTimeDeliveryBadge },
  { big: "AFTER", sub: "sales care", caption: "SUPPORT", image: afterSalesBadge },
  { big: "END to END", sub: "interior", caption: "SOLUTIONS", image: endToEndBadge },
];

const TrustStrip = ({ accent, header }: { accent: string; header: string }) => (
  <div className="mt-8 pt-6 border-t" style={{ borderColor: accent + "33" }}>
    <h3 className="text-center font-display text-xl sm:text-2xl mb-1" style={{ color: header }}>
      What Makes Us Great
    </h3>
    <p className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-5">
      Premium · Reliable · On-Time
    </p>
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
      {TRUST_TILES.map((t) => (
        <div
          key={t.big + t.caption}
          className="relative aspect-square flex flex-col items-center justify-center text-center px-1 py-2 bg-white"
          style={{ border: t.image ? "none" : `1.5px solid ${accent}` }}
        >
          {t.image ? (
            <img src={t.image} alt={`${t.big} ${t.sub} ${t.caption}`} className="w-full h-full object-contain" />
          ) : (
            <>
              <span className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: accent }} />
              <span className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: accent }} />
              <span className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: accent }} />
              <span className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: accent }} />
              <div className="font-display font-bold leading-none text-base sm:text-xl" style={{ color: header }}>
                {t.big}
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 lowercase">{t.sub}</div>
              <div className="text-[9px] sm:text-[10px] font-bold tracking-wider mt-1" style={{ color: accent }}>
                {t.caption}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  </div>
);

export const QuotationPreview = ({ quotation, rooms }: QuotationPreviewProps) => {
  const fmt = quotation.template_format;
  const [brand, setBrand] = useState<CompanyBrand | null>(null);

  useEffect(() => {
    supabase.from("company_settings" as never).select("*").limit(1).maybeSingle()
      .then(({ data }) => { if (data) setBrand(data as unknown as CompanyBrand); });
  }, []);

  return (
    <div className="bg-white text-foreground p-6 sm:p-8 rounded-md border border-border" id="quotation-preview">
      <Header q={quotation} brand={brand} />
      <CustomerBlock q={quotation} />
      <BrandsStrip quotation={quotation} accent={brand?.accent_color ?? "hsl(var(--primary))"} />

      {fmt === "premium" && (
        <div className="my-4 p-4 rounded-md bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/20">
          <p className="text-sm text-foreground italic">
            Thank you for considering Chirpeel Interiors. We're excited to bring your vision to life with premium materials, expert craftsmanship, and on-time delivery.
          </p>
        </div>
      )}

      {fmt !== "summary" && (
        <div className="space-y-4">
          {rooms.map((r, i) => (
            <div key={r.tempId} className="border border-border rounded-md overflow-hidden">
              <div className="flex items-center justify-between bg-muted/40 px-3 py-2 border-b border-border">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="font-semibold">{r.room_name || "Untitled room"}</span>
                  {r.area_sqft > 0 && <span className="text-xs text-muted-foreground">· {r.area_sqft.toFixed(1)} sqft</span>}
                  {r.material_type_key && <span className="text-xs text-muted-foreground capitalize">· {r.material_type_key.replace(/_/g, " ")}</span>}
                  {r.shutter_finish && <span className="text-xs text-muted-foreground">· {r.shutter_finish} finish</span>}
                </div>
                <span className="font-semibold text-primary text-sm">{formatINR(r.total_cost)}</span>
              </div>
              {(r.line_items?.length ?? 0) > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-background text-muted-foreground border-b border-border">
                      <th className="text-left py-1.5 px-3">Item</th>
                      <th className="text-left py-1.5 px-2">Category</th>
                      <th className="text-right py-1.5 px-2">Sqft</th>
                      <th className="text-right py-1.5 px-2">Qty</th>
                      <th className="text-right py-1.5 px-2">Rate</th>
                      <th className="text-right py-1.5 px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.line_items.map((li) => (
                      <tr key={li.tempId} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 px-3">{li.item_name}</td>
                        <td className="py-1.5 px-2 text-muted-foreground capitalize">{li.item_category.replace("_", " ")}</td>
                        <td className="py-1.5 px-2 text-right">{li.pricing_mode === "sqft" ? li.area_sqft.toFixed(1) : "—"}</td>
                        <td className="py-1.5 px-2 text-right">{li.quantity}</td>
                        <td className="py-1.5 px-2 text-right">{formatINR(li.rate)}{li.pricing_mode === "sqft" ? "/sqft" : ""}</td>
                        <td className="py-1.5 px-3 text-right font-medium">{formatINR(li.total_cost)}</td>
                      </tr>
                    ))}
                    {(r.material_name || r.hardware_name || r.custom_cost > 0) && (
                      <tr className="border-b border-border/50 bg-muted/20">
                        <td className="py-1.5 px-3 italic text-muted-foreground" colSpan={5}>
                          {[r.material_name, r.hardware_name].filter(Boolean).join(" + ")}{r.custom_cost > 0 ? ` + custom` : ""}
                        </td>
                        <td className="py-1.5 px-3 text-right font-medium">
                          {formatINR(r.area_sqft * r.quantity * (r.material_rate + r.hardware_rate) + r.hardware_fixed + r.custom_cost)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground italic">No line items added</div>
              )}
              {r.notes && <div className="px-3 py-1.5 text-xs text-muted-foreground italic border-t border-border">Note: {r.notes}</div>}
            </div>
          ))}
          {rooms.length === 0 && <div className="py-6 text-center text-muted-foreground text-sm">No rooms added yet</div>}
        </div>
      )}

      {fmt === "summary" && (
        <div className="space-y-1 py-4">
          {rooms.map((r) => (
            <div key={r.tempId} className="flex justify-between text-sm border-b border-border py-1">
              <span>{r.room_name}</span>
              <span className="font-semibold">{formatINR(r.total_cost)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Totals q={quotation} />
      </div>

      {quotation.terms_conditions && (
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="font-semibold text-sm mb-2">Terms & Conditions</h4>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{quotation.terms_conditions}</pre>
        </div>
      )}

      <TrustStrip accent={brand?.accent_color ?? "hsl(var(--primary))"} header={brand?.header_color ?? "hsl(var(--foreground))"} />

      <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted-foreground">
        {brand?.footer_note ?? `Thank you for choosing ${brand?.company_name ?? "Chirpeel Interiors"} · This is a computer-generated quotation`}
      </div>
    </div>
  );
};
