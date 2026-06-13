import type { ProjectBoqItem } from "./boq-types";
import type { Vendor } from "../vendors/types";

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

/** Build the WhatsApp message body for a vendor PO. */
export function buildPOMessage(opts: {
  companyName: string;
  poNumber: string;
  projectName: string;
  vendorName: string;
  items: { name: string; qty: number; unit: string; rate: number; total: number }[];
  subtotal: number;
  gst: number;
  total: number;
  paymentTerms?: string | null;
  contact?: string | null;
}): string {
  const lines: string[] = [];
  lines.push(`*${opts.companyName}* — Purchase Order`);
  lines.push(`PO: *${opts.poNumber}*`);
  lines.push(`Project: ${opts.projectName}`);
  lines.push(`To: ${opts.vendorName}`);
  lines.push("");
  lines.push("*Items:*");
  opts.items.forEach((it, i) => {
    lines.push(
      `${i + 1}. ${it.name} — ${it.qty} ${it.unit} × ₹${it.rate.toLocaleString("en-IN")} = ₹${it.total.toLocaleString("en-IN")}`
    );
  });
  lines.push("");
  lines.push(`Subtotal: ₹${opts.subtotal.toLocaleString("en-IN")}`);
  lines.push(`GST: ₹${opts.gst.toLocaleString("en-IN")}`);
  lines.push(`*Total: ₹${opts.total.toLocaleString("en-IN")}*`);
  if (opts.paymentTerms) {
    lines.push("");
    lines.push(`Terms: ${opts.paymentTerms}`);
  }
  lines.push("");
  lines.push("Please reply to confirm acceptance and expected delivery date.");
  if (opts.contact) lines.push(`— ${opts.contact}`);
  return lines.join("\n");
}

/**
 * Validate a phone number for WhatsApp deep links.
 * Accepts Indian 10-digit (auto-prefixed with 91) or international E.164-style 8–15 digits.
 * Returns the normalized digits-only phone, or an error message.
 */
export function validateWhatsAppPhone(phoneRaw: string | null | undefined):
  | { ok: true; phone: string }
  | { ok: false; error: string } {
  if (!phoneRaw || !phoneRaw.trim()) return { ok: false, error: "Vendor has no phone number." };
  if (/[a-zA-Z]/.test(phoneRaw)) return { ok: false, error: "Phone number contains letters." };
  const digits = phoneRaw.replace(/\D/g, "");
  if (!digits) return { ok: false, error: "Phone number has no digits." };
  // Indian local 10-digit → prefix 91. Mobile numbers start with 6–9.
  if (digits.length === 10) {
    if (!/^[6-9]/.test(digits)) return { ok: false, error: "Indian mobile numbers must start with 6–9." };
    return { ok: true, phone: `91${digits}` };
  }
  // International / already-prefixed numbers: WhatsApp accepts 8–15 digits (E.164).
  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, error: "Phone must be 10 digits (India) or 8–15 with country code." };
  }
  return { ok: true, phone: digits };
}

/** Open WhatsApp deep link in a new tab. */
export function openWhatsApp(phoneRaw: string, text: string) {
  const v = validateWhatsAppPhone(phoneRaw);
  if (!v.ok) return false;
  const url = `https://wa.me/${v.phone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

/** Group BOQ items by vendor_id; skip rows with no vendor or already on a PO. */
export function groupItemsForPO(items: ProjectBoqItem[]) {
  const map = new Map<string, ProjectBoqItem[]>();
  for (const it of items) {
    if (!it.vendor_id || it.po_id || !it.quantity || !it.total) continue;
    const arr = map.get(it.vendor_id) ?? [];
    arr.push(it);
    map.set(it.vendor_id, arr);
  }
  return map;
}

export function vendorLabel(v: Vendor | undefined) {
  return v ? `${v.name}${v.contact_person ? ` (${v.contact_person})` : ""}` : "Vendor";
}
