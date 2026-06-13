// Generate quotation PDF, upload to storage, return shareable URL
// Optionally email the customer via Lovable Emails (when configured)
// Always returns whatsapp_url with a pre-filled message
// @ts-nocheck deno

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import "https://esm.sh/jspdf-autotable@3.8.4?deps=jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  quotationId: string;
  channel: "email" | "whatsapp";
  isRevision?: boolean;
  revisionNote?: string;
  sentBy?: string;
}

const formatINR = (n: number): string =>
  "INR " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n || 0);

const DEFAULT_COMPANY = {
  company_name: "Chirpeel Interiors",
  tagline: "Premium Modular Interiors",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  whatsapp: "",
  email: "hello@chirpeel.com",
  website: "chirpeel.com",
  gstin: "",
  logo_url: "",
  logo_size: "md",
  header_color: "#0F2C5F",
  accent_color: "#0F2C5F",
  footer_note: "Computer-generated quotation",
};

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [15, 44, 95];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};

const LOGO_PT: Record<string, number> = { sm: 36, md: 54, lg: 72, xl: 96 };

const TRUST_BADGE_BASE =
  "https://wxycnzteeqnqanupauuh.supabase.co/storage/v1/object/public/company-assets/trust-badges";
const BRAND_LOGO_BASE =
  "https://wxycnzteeqnqanupauuh.supabase.co/storage/v1/object/public/company-assets/brand-logos";
const BRAND_LOGOS: Record<string, { name: string; file: string | null }> = {
  ebco: { name: "Ebco", file: "ebco.jpg" },
  hettich: { name: "Hettich", file: "hettich.png" },
  hafele: { name: "Hafele", file: "hafele.png" },
  blum: { name: "Blum", file: "blum.png" },
  century: { name: "Century", file: "centuryply.png" },
  greenply: { name: "Greenply", file: "greenply.jpg" },
  sharon: { name: "Sharon", file: null },
  chirpeel: { name: "Chirpeel", file: "chirpeel-logo-square.png" },
  merino: { name: "Merino", file: "merino.jpg" },
  airolam: { name: "Airolam", file: null },
  greenlam: { name: "Greenlam", file: "greenlam.png" },
  stylam: { name: "Stylam", file: null },
  centurylam: { name: "Century Lam", file: "centuryply.png" },
  praveedh: { name: "Praveedh", file: "praveedh.png" },
  rehau: { name: "Rehau", file: "rehau.jpg" },
  saint_gobain_gyproc: { name: "Saint-Gobain Gyproc", file: "gyproc.png" },
};
const TRUST_BADGES: { file: string; label: string }[] = [
  { file: "badge-10-year-warranty.png", label: "10-Year Warranty" },
  { file: "badge-45-day-delivery.png", label: "45-Day Delivery" },
  { file: "badge-no-hidden-cost.png", label: "No Hidden Cost" },
  { file: "badge-on-time-delivery.png", label: "On-Time Delivery" },
  { file: "badge-after-sales-support.png", label: "After-Sales Support" },
  { file: "badge-end-to-end.png", label: "End-to-End Solutions" },
];

async function fetchLogoDataUrl(url: string): Promise<{ data: string; format: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const ct = res.headers.get("content-type") || "image/png";
    const format = ct.includes("jpeg") || ct.includes("jpg") ? "JPEG" : ct.includes("webp") ? "WEBP" : "PNG";
    return { data: `data:${ct};base64,${b64}`, format };
  } catch { return null; }
}

function buildPdf(q: any, rooms: any[], company: any, logoImg: { data: string; format: string } | null, badgeImgs: ({ data: string; format: string } | null)[], brandLogoMap: Record<string, { data: string; format: string } | null>): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  const isPremium = q.template_format === "premium";
  const isSummary = q.template_format === "summary";
  const [hr, hg, hb] = hexToRgb(company.header_color || "#0F2C5F");
  const [ar, ag, ab] = hexToRgb(company.accent_color || "#0F2C5F");
  const logoSize = LOGO_PT[company.logo_size] ?? 54;

  // Header band
  if (isPremium) {
    doc.setFillColor(hr, hg, hb);
    doc.rect(0, 0, pageW, 110, "F");
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setTextColor(20, 20, 40);
  }

  let textX = margin;
  if (logoImg) {
    try {
      doc.addImage(logoImg.data, logoImg.format, margin, isPremium ? 14 : 30, logoSize, logoSize);
      textX = margin + logoSize + 14;
    } catch { /* ignore */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(company.company_name || "Company", textX, isPremium ? 32 : 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  if (company.tagline) doc.text(company.tagline, textX, isPremium ? 46 : 60);

  // Address + contact lines
  const lines: string[] = [];
  if (company.address_line1) lines.push(company.address_line1);
  if (company.address_line2) lines.push(company.address_line2);
  const cityLine = [company.city, company.state, company.pincode].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  const contact1 = [company.phone && `Ph: ${company.phone}`, company.whatsapp && company.whatsapp !== company.phone && `WA: ${company.whatsapp}`].filter(Boolean).join("  ·  ");
  if (contact1) lines.push(contact1);
  const contact2 = [company.email, company.website].filter(Boolean).join("  ·  ");
  if (contact2) lines.push(contact2);
  if (company.gstin) lines.push(`GSTIN: ${company.gstin}`);

  doc.setFontSize(8);
  let ly = isPremium ? 58 : 72;
  for (const line of lines) {
    doc.text(line, textX, ly);
    ly += 10;
  }

  // Quotation meta (right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("QUOTATION", pageW - margin, isPremium ? 32 : 46, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(q.quotation_number ?? "DRAFT", pageW - margin, isPremium ? 46 : 60, { align: "right" });
  doc.text(`Date: ${q.quotation_date}`, pageW - margin, isPremium ? 60 : 74, { align: "right" });
  doc.text(`Valid: ${q.validity_days} days`, pageW - margin, isPremium ? 74 : 88, { align: "right" });

  doc.setTextColor(20, 20, 40);
  y = Math.max(isPremium ? 130 : 130, ly + 16);

  // Customer / Project blocks
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.text("BILL TO", margin, y);
  doc.text("PROJECT", pageW / 2, y);
  doc.setTextColor(20, 20, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(q.customer_name || "—", margin, y + 14);
  doc.text(q.project_name || "—", pageW / 2, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(q.customer_phone || "", margin, y + 28);
  doc.text(q.project_type || "", pageW / 2, y + 28);
  if (q.customer_email) doc.text(q.customer_email, margin, y + 40);
  if (q.sales_person) doc.text(`Sales: ${q.sales_person}`, pageW / 2, y + 40);
  let billY = y + 52;
  if (q.customer_address) {
    const addrLines = doc.splitTextToSize(String(q.customer_address), pageW / 2 - margin - 8);
    doc.text(addrLines, margin, billY);
    billY += addrLines.length * 11;
  }
  if (q.project_location) {
    doc.text(q.project_location, margin, billY);
    billY += 12;
  }

  y = Math.max(y + 70, billY + 8);

  // Brands strip — grouped by Woodwork / False Ceiling / Paint / Electrical
  const toIds = (csv: string | null | undefined): string[] =>
    (csv ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  // Resolve brand display name (fallback = id prettified)
  const brandName = (id: string): string => {
    const meta = BRAND_LOGOS[id];
    if (meta?.name) return meta.name;
    return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const sel: Record<string, string | null> = (q.brand_selections ?? {}) as Record<string, string | null>;
  const pickOne = (id: string | null | undefined): string[] => (id ? [id] : []);

  type BrandRow = { label: string; ids: string[] };
  type BrandGroup = { label: string; rows: BrandRow[] };

  const allGroups: BrandGroup[] = [
    {
      label: "WOODWORK",
      rows: [
        { label: "Hardware", ids: toIds(q.hardware_brand) },
        { label: "Core Material", ids: toIds(q.core_material_brand) },
        { label: "Laminate", ids: toIds(q.laminate_brand) },
        { label: "Acrylic", ids: pickOne(sel.acrylic) },
        { label: "PU Paint", ids: pickOne(sel.pu_paint) },
        { label: "Membrane", ids: pickOne(sel.membrane) },
      ],
    },
    {
      label: "FALSE CEILING",
      rows: [
        { label: "Gypsum", ids: pickOne(sel.gypsum) },
        { label: "Channel", ids: pickOne(sel.channel) },
      ],
    },
    {
      label: "PAINT",
      rows: [{ label: "Paint", ids: pickOne(sel.paint) }],
    },
    {
      label: "ELECTRICAL",
      rows: [
        { label: "Wiring", ids: pickOne(sel.wiring) },
        { label: "Switches & Sockets", ids: pickOne(sel.switches) },
      ],
    },
  ]
    .map((g) => ({ ...g, rows: g.rows.filter((r) => r.ids.length > 0) }))
    .filter((g) => g.rows.length > 0);

  if (allGroups.length > 0) {
    const boxPadX = 12;
    const boxPadY = 12;
    const titleH = 14;
    const groupHeaderH = 18;
    const subLabelH = 11;
    const logoMaxH = 28;
    const logoMaxW = 70;
    const nameH = 11;
    const rowGap = 6;
    const bandGap = 10;

    // Per-band height = group header + max sub-column height across that band's rows
    const bandHeights = allGroups.map((g) => {
      const subColHeights = g.rows.map(
        (r) => subLabelH + r.ids.length * (logoMaxH + nameH + rowGap) + 4,
      );
      const maxSub = subColHeights.length ? Math.max(...subColHeights) : 0;
      return groupHeaderH + maxSub + 6;
    });
    const totalBandsH = bandHeights.reduce((a, b) => a + b, 0) + bandGap * (allGroups.length - 1);
    const boxH = boxPadY * 2 + titleH + totalBandsH;

    doc.setFillColor(245, 247, 255);
    doc.roundedRect(margin, y, pageW - 2 * margin, boxH, 4, 4, "F");

    // Title
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 130);
    doc.setFont("helvetica", "bold");
    doc.text("BRANDS USED IN THIS PROJECT", margin + boxPadX, y + boxPadY + 2);

    const usableW = pageW - 2 * margin - boxPadX * 2;
    const bandLeft = margin + boxPadX;
    let bandY = y + boxPadY + titleH;

    for (let gi = 0; gi < allGroups.length; gi++) {
      const group = allGroups[gi];
      const bandW = usableW;
      const bandCenter = bandLeft + bandW / 2;

      // Group banner (centered) with underline spanning the band
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(ar, ag, ab);
      doc.text(group.label, bandCenter, bandY + 9, { align: "center" });
      doc.setDrawColor(ar, ag, ab);
      doc.setLineWidth(0.6);
      doc.line(bandLeft, bandY + 13, bandLeft + bandW, bandY + 13);

      // Sub-columns side-by-side
      const subCount = group.rows.length;
      const subColW = bandW / subCount;
      const subTop = bandY + groupHeaderH;

      for (let si = 0; si < subCount; si++) {
        const row = group.rows[si];
        const sx = bandLeft + si * subColW;
        const sxCenter = sx + subColW / 2;

        // Sub-category label
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140, 140, 150);
        doc.text(row.label.toUpperCase(), sxCenter, subTop + 6, { align: "center" });
        let by = subTop + subLabelH;

        for (const id of row.ids) {
          const name = brandName(id);
          const img = brandLogoMap[id];
          if (img) {
            try {
              const props = (doc as any).getImageProperties?.(img.data);
              let w = logoMaxW, h = logoMaxH;
              if (props?.width && props?.height) {
                const ratio = props.width / props.height;
                if (ratio >= logoMaxW / logoMaxH) {
                  w = logoMaxW; h = logoMaxW / ratio;
                } else {
                  h = logoMaxH; w = logoMaxH * ratio;
                }
              }
              doc.addImage(img.data, img.format, sxCenter - w / 2, by, w, h);
              by += Math.max(h, 14);
            } catch {
              by += 4;
            }
          } else {
            // Text-only chip fallback
            doc.setDrawColor(200, 205, 220);
            doc.setFillColor(255, 255, 255);
            doc.setLineWidth(0.4);
            const chipW = Math.min(subColW - 16, 80);
            const chipH = 14;
            doc.roundedRect(sxCenter - chipW / 2, by, chipW, chipH, 3, 3, "FD");
            by += chipH;
          }
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(20, 20, 40);
          doc.text(name, sxCenter, by + 8, { align: "center" });
          by += nameH + rowGap;
        }
      }

      bandY += bandHeights[gi] + (gi < allGroups.length - 1 ? bandGap : 0);
    }

    doc.setTextColor(20, 20, 40);
    doc.setFont("helvetica", "normal");
    y += boxH + 10;
  }


  if (isPremium) {
    doc.setFillColor(245, 247, 255);
    doc.roundedRect(margin, y, pageW - 2 * margin, 36, 4, 4, "F");
    doc.setTextColor(60, 60, 90);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Thank you for considering Chirpeel Interiors. We're excited to bring your vision to life.",
      margin + 12,
      y + 22,
    );
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 40);
    y += 50;
  }

  // Line items
  if (isSummary) {
    (doc as any).autoTable({
      startY: y,
      head: [["Room / Item", "Amount"]],
      body: rooms.map((r) => [r.room_name, formatINR(Number(r.total_cost))]),
      headStyles: { fillColor: [0, 30, 200], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
  } else {
    // Detailed: room-by-room with line items
    for (let ri = 0; ri < rooms.length; ri++) {
      const r = rooms[ri];
      const items = r.line_items ?? [];

      // Room header band
      doc.setFillColor(245, 247, 255);
      doc.rect(margin, y, pageW - 2 * margin, 22, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 40);
      doc.text(`${ri + 1}. ${r.room_name || "Untitled"}`, margin + 8, y + 15);
      const headRight = `${Number(r.area_sqft || 0).toFixed(1)} sqft${r.core_material_name ? ` · ${r.core_material_name}` : ""}${r.shutter_finish ? ` · ${r.shutter_finish}` : ""}  —  ${formatINR(Number(r.total_cost))}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(headRight, pageW - margin - 8, y + 15, { align: "right" });
      y += 24;

      const body: (string | number)[][] = items.map((li: any) => [
        li.item_name,
        String(li.item_category || "").replace("_", " "),
        li.pricing_mode === "sqft" ? Number(li.area_sqft || 0).toFixed(1) : "—",
        li.quantity ?? 1,
        formatINR(Number(li.rate)) + (li.pricing_mode === "sqft" ? "/sqft" : ""),
        formatINR(Number(li.total_cost)),
      ]);

      // Legacy material/hardware row
      const legacyAmt = Number(r.area_sqft || 0) * Number(r.quantity || 1) * (Number(r.material_rate || 0) + Number(r.hardware_rate || 0))
                      + Number(r.hardware_fixed || 0) + Number(r.custom_cost || 0);
      if (r.material_name || r.hardware_name || Number(r.custom_cost || 0) > 0) {
        body.push([
          [r.material_name, r.hardware_name].filter(Boolean).join(" + ") + (Number(r.custom_cost || 0) > 0 ? " + custom" : ""),
          "finish",
          Number(r.area_sqft || 0).toFixed(1),
          r.quantity ?? 1,
          "—",
          formatINR(legacyAmt),
        ]);
      }

      if (body.length > 0) {
        (doc as any).autoTable({
          startY: y,
          head: [["Item", "Category", "Sqft", "Qty", "Rate", "Amount"]],
          body,
          headStyles: { fillColor: [230, 233, 245], textColor: 30, fontSize: 8 },
          styles: { fontSize: 8.5, cellPadding: 4 },
          columnStyles: {
            2: { halign: "right", cellWidth: 40 },
            3: { halign: "right", cellWidth: 28 },
            4: { halign: "right", cellWidth: 60 },
            5: { halign: "right", cellWidth: 70 },
          },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      } else {
        doc.setFontSize(8.5);
        doc.setTextColor(140);
        doc.text("No line items", margin + 8, y + 12);
        doc.setTextColor(20, 20, 40);
        y += 20;
      }

      if (y > 720) { doc.addPage(); y = margin; }
    }
  }

  // Use last table position if available, else current y
  if ((doc as any).lastAutoTable?.finalY) y = Math.max(y, (doc as any).lastAutoTable.finalY + 16);
  if (y > 700) { doc.addPage(); y = margin; }

  // Totals box
  const boxX = pageW - margin - 220;
  const lineH = 16;
  let ty = y;
  doc.setFontSize(9);
  doc.text("Subtotal", boxX, ty);
  doc.text(formatINR(Number(q.subtotal)), pageW - margin, ty, { align: "right" });
  ty += lineH;
  if (Number(q.discount_amount) > 0) {
    doc.setTextColor(200, 60, 60);
    doc.text("Discount", boxX, ty);
    doc.text("- " + formatINR(Number(q.discount_amount)), pageW - margin, ty, { align: "right" });
    doc.setTextColor(20, 20, 40);
    ty += lineH;
  }
  if (q.gst_enabled) {
    doc.text(`GST (${q.gst_rate}%)`, boxX, ty);
    doc.text(formatINR(Number(q.gst_amount)), pageW - margin, ty, { align: "right" });
    ty += lineH;
  }
  doc.setDrawColor(200);
  doc.line(boxX, ty - 6, pageW - margin, ty - 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Grand Total", boxX, ty + 6);
  doc.setTextColor(ar, ag, ab);
  doc.text(formatINR(Number(q.total_amount)), pageW - margin, ty + 6, { align: "right" });
  doc.setTextColor(20, 20, 40);
  doc.setFont("helvetica", "normal");
  ty += 28;

  // Terms
  if (q.terms_conditions) {
    if (ty > 700) { doc.addPage(); ty = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Terms & Conditions", margin, ty);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(q.terms_conditions, pageW - 2 * margin);
    doc.text(lines, margin, ty + 14);
  }

  // Trust strip — "What Makes Us Great"
  const stripNeeded = 130;
  let stripY = (doc as any).lastAutoTable?.finalY ? Math.max(ty, (doc as any).lastAutoTable.finalY + 16) : ty;
  if (q.terms_conditions) stripY = Math.max(stripY, ty + 60);
  if (stripY + stripNeeded > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    stripY = margin;
  }
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(ar, ag, ab);
  doc.text("What Makes Us Great", pageW / 2, stripY + 14, { align: "center" });
  doc.setTextColor(20, 20, 40);

  // Badges row
  const badgeSize = 64;
  const usableW = pageW - 2 * margin;
  const gap = (usableW - badgeSize * TRUST_BADGES.length) / (TRUST_BADGES.length - 1);
  const rowY = stripY + 26;
  for (let i = 0; i < TRUST_BADGES.length; i++) {
    const img = badgeImgs[i];
    const x = margin + i * (badgeSize + gap);
    if (img) {
      try {
        doc.addImage(img.data, img.format, x, rowY, badgeSize, badgeSize);
      } catch { /* ignore */ }
    }
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 24;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text((company.footer_note || "Computer-generated quotation") + " · " + (company.company_name || ""), pageW / 2, footerY, { align: "center" });

  return new Uint8Array(doc.output("arraybuffer"));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { quotationId, channel, isRevision = false, revisionNote, sentBy } = (await req.json()) as RequestBody;
    if (!quotationId || !channel) {
      return new Response(JSON.stringify({ error: "Missing quotationId or channel" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: q, error: qErr }, { data: rooms, error: rErr }, { data: brand }] = await Promise.all([
      supabase.from("quotations").select("*").eq("id", quotationId).single(),
      supabase.from("quotation_rooms").select("*").eq("quotation_id", quotationId).order("sort_order"),
      supabase.from("company_settings" as any).select("*").limit(1).maybeSingle(),
    ]);
    if (qErr || !q) throw new Error("Quotation not found");
    if (rErr) throw rErr;

    const company = { ...DEFAULT_COMPANY, ...(brand ?? {}) };

    // Fetch line items for all rooms and attach
    const roomIds = (rooms ?? []).map((r: any) => r.id);
    let items: any[] = [];
    if (roomIds.length) {
      const { data: itemsData, error: iErr } = await supabase
        .from("quotation_room_items")
        .select("*")
        .in("quotation_room_id", roomIds)
        .order("sort_order");
      if (iErr) throw iErr;
      items = itemsData ?? [];
    }
    const roomsWithItems = (rooms ?? []).map((r: any) => ({
      ...r,
      line_items: items.filter((it) => it.quotation_room_id === r.id),
    }));

    // Collect brand IDs from this quotation (legacy CSV columns + brand_selections JSON)
    const brandIdsSet = new Set<string>();
    for (const csv of [q.hardware_brand, q.core_material_brand, q.laminate_brand]) {
      (csv ?? "").split(",").map((s: string) => s.trim()).filter(Boolean).forEach((id: string) => brandIdsSet.add(id));
    }
    const sel = (q.brand_selections ?? {}) as Record<string, string | null>;
    for (const id of Object.values(sel)) {
      if (id && typeof id === "string") brandIdsSet.add(id);
    }
    const brandIds = Array.from(brandIdsSet);

    // Fetch logo + trust badges + brand logos in parallel as base64
    const [logoImg, badgeImgsArr, brandImgsArr] = await Promise.all([
      company.logo_url ? fetchLogoDataUrl(company.logo_url) : Promise.resolve(null),
      Promise.all(TRUST_BADGES.map((b) => fetchLogoDataUrl(`${TRUST_BADGE_BASE}/${b.file}`))),
      Promise.all(brandIds.map((id) => {
        const meta = BRAND_LOGOS[id];
        return meta?.file ? fetchLogoDataUrl(`${BRAND_LOGO_BASE}/${meta.file}`) : Promise.resolve(null);
      })),
    ]);
    const brandLogoMap: Record<string, { data: string; format: string } | null> = {};
    brandIds.forEach((id, i) => { brandLogoMap[id] = brandImgsArr[i]; });

    // Build PDF
    const pdfBytes = buildPdf(q, roomsWithItems, company, logoImg, badgeImgsArr, brandLogoMap);
    const fileName = `${q.quotation_number}.pdf`;
    const filePath = `${q.id}/${fileName}`;

    const { error: upErr } = await supabase.storage.from("quotations").upload(filePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from("quotations").getPublicUrl(filePath);
    const pdf_url = pub.publicUrl;

    // Update quotation: track first send vs revision separately
    const nowIso = new Date().toISOString();
    const currentRevision = Number(q.revision_count ?? 0);
    const newVersion = isRevision ? currentRevision + 1 : Math.max(currentRevision, 1);
    const updatePayload: Record<string, unknown> = {
      pdf_url,
      status: "sent",
      last_sent_at: nowIso,
    };
    if (!q.sent_at) updatePayload.sent_at = nowIso;
    if (isRevision) updatePayload.revision_count = newVersion;
    else if (!q.sent_at) updatePayload.revision_count = 1;
    await supabase.from("quotations").update(updatePayload).eq("id", quotationId);

    let whatsapp_url: string | undefined;
    let email_sent = false;
    let short_pdf_url = pdf_url;

    // Shorten the PDF URL via TinyURL (no API key needed). Falls back to original on failure.
    try {
      const tinyRes = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(pdf_url)}`);
      if (tinyRes.ok) {
        const shortened = (await tinyRes.text()).trim();
        if (shortened.startsWith("http")) short_pdf_url = shortened;
      }
    } catch (e) {
      console.warn("TinyURL shorten failed, using original URL:", e);
    }

    // WhatsApp link — return a mobile-safe base link; frontend rewrites to desktop-safe Web URL when needed
    let renderedMessage: string | null = null;
    if (channel === "whatsapp") {
      let phone = (q.customer_phone || "").replace(/\D/g, "");
      if (phone.startsWith("0")) phone = phone.slice(1);
      if (phone.length === 10) phone = "91" + phone;
      if (!phone || phone.length < 11) {
        throw new Error("Customer WhatsApp number is invalid. Please include a valid mobile number.");
      }

      // Pick the right template key for first send vs revision
      const templateKey = isRevision ? "quotation_revision" : "quotation_send";
      const { data: tpl } = await supabase
        .from("message_templates" as any)
        .select("body")
        .eq("key", templateKey)
        .maybeSingle();

      const defaultOriginal =
        `Hello {{customer_name}},\n\n` +
        `Greetings from {{company_name}}!\n\n` +
        `Please find your interior quotation details below:\n\n` +
        `📄 Quotation No: {{quotation_number}}\n` +
        `🛠 10-Year Warranty | 🚚 45-Day Delivery | 🔧 After-Sales Support | 🏭 Factory Precision\n\n` +
        `You can view or download your quotation here:\n{{pdf_url}}\n\n` +
        `Kindly review the quotation and share your feedback. We'd be happy to assist you with any changes or clarifications.\n\n` +
        `Looking forward to your response.\n\n` +
        `— Team {{company_name}}`;

      const defaultRevision =
        `Hello {{customer_name}},\n\n` +
        `As per our discussion, please find the *revised quotation* (v{{version}}) below:\n\n` +
        `📄 Quotation No: {{quotation_number}}\n` +
        `🔄 Revision: v{{version}}\n` +
        `{{revision_note_block}}` +
        `View the updated quotation here:\n{{pdf_url}}\n\n` +
        `Kindly review and let us know if everything looks good or if any further changes are needed.\n\n` +
        `Thank you,\n— Team {{company_name}}`;

      const body = (tpl?.body as string) || (isRevision ? defaultRevision : defaultOriginal);
      const noteBlock = revisionNote && revisionNote.trim()
        ? `📝 Changes: ${revisionNote.trim()}\n\n`
        : "";

      renderedMessage = body
        .replaceAll("{{customer_name}}", q.customer_name ?? "")
        .replaceAll("{{company_name}}", company.company_name ?? "Chirpeel Interiors")
        .replaceAll("{{quotation_number}}", q.quotation_number ?? "")
        .replaceAll("{{pdf_url}}", short_pdf_url)
        .replaceAll("{{total_amount}}", formatINR(Number(q.total_amount)))
        .replaceAll("{{version}}", String(newVersion))
        .replaceAll("{{revision_note}}", revisionNote?.trim() ?? "")
        .replaceAll("{{revision_note_block}}", noteBlock);

      whatsapp_url = `https://wa.me/${phone}?text=${encodeURIComponent(renderedMessage)}`;
    }

    // Email (best-effort — only if customer email + transactional email infra exists)
    if (channel === "email" && q.customer_email) {
      try {
        const { error: emailErr } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: isRevision ? "quotation-revised" : "quotation-shared",
            recipientEmail: q.customer_email,
            idempotencyKey: `quotation-${q.id}-${nowIso}`,
            templateData: {
              customerName: q.customer_name,
              quotationNumber: q.quotation_number,
              totalAmount: formatINR(Number(q.total_amount)),
              pdfUrl: pdf_url,
              salesPerson: q.sales_person ?? "Chirpeel Team",
              revisionVersion: newVersion,
              revisionNote: revisionNote ?? "",
              isRevision,
            },
          },
        });
        if (!emailErr) email_sent = true;
        else console.warn("Email send skipped:", emailErr.message);
      } catch (e) {
        console.warn("Email infrastructure not configured:", e);
      }
    }

    // Audit log: record this send
    await supabase.from("quotation_send_history" as any).insert({
      quotation_id: quotationId,
      version: newVersion,
      sent_at: nowIso,
      sent_by: sentBy ?? null,
      channel,
      pdf_url,
      message_body: renderedMessage,
      note: revisionNote ?? null,
      is_revision: isRevision,
    });

    return new Response(JSON.stringify({
      pdf_url, short_pdf_url, whatsapp_url, email_sent,
      revision_count: newVersion, is_revision: isRevision,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("send-quotation error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
