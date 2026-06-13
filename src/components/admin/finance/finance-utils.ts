import { supabase } from "@/integrations/supabase/client";

export async function uploadReceipt(file: File, prefix: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("finance-receipts").upload(path, file, { upsert: false });
  if (error) {
    console.error("upload error", error);
    return null;
  }
  return path;
}

export async function getReceiptSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("finance-receipts").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function ageBucket(dueDate: string): "current" | "0-30" | "31-60" | "60+" {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const days = Math.floor((now - due) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "current";
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  return "60+";
}

export function buildWhatsAppLink(phone: string | null | undefined, message: string) {
  const clean = (phone || "").replace(/\D/g, "");
  const withCC = clean.length === 10 ? `91${clean}` : clean;
  return `https://wa.me/${withCC}?text=${encodeURIComponent(message)}`;
}

export function reminderMessage(invoice: { invoice_number: string; customer_name: string; total_amount: number; due_date: string; }) {
  const amt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(invoice.total_amount);
  return `Hi ${invoice.customer_name}, this is a friendly reminder from Chirpeel Interiors for invoice ${invoice.invoice_number} of ${amt}, due on ${new Date(invoice.due_date).toLocaleDateString("en-IN")}. Kindly arrange the payment at your convenience. Thank you!`;
}
