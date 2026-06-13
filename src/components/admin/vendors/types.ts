export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  payment_terms: string | null;
  rating: number | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  project_id: string | null;
  lead_id: string | null;
  po_date: string;
  amount: number;
  gst_amount: number;
  total_amount: number;
  status: string;
  description: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
}

export const VENDOR_CATEGORIES = [
  { key: "carpenter", label: "Carpenter" },
  { key: "electrician", label: "Electrician" },
  { key: "plumber", label: "Plumber" },
  { key: "hardware", label: "Hardware" },
  { key: "laminate", label: "Laminate / Veneer" },
  { key: "core_material", label: "Core Material" },
  { key: "appliance", label: "Appliances" },
  { key: "transport", label: "Transport" },
  { key: "painter", label: "Painter / Polish" },
  { key: "other", label: "Other" },
];

export const PO_STATUSES = [
  { key: "draft",     label: "Draft",     cls: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "sent",      label: "Sent",      cls: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "accepted",  label: "Accepted",  cls: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "rejected",  label: "Rejected",  cls: "bg-red-100 text-red-700 border-red-200" },
  { key: "delivered", label: "Delivered", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "received",  label: "Received",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "paid",      label: "Paid",      cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "cancelled", label: "Cancelled", cls: "bg-red-100 text-red-700 border-red-200" },
];

/** Ordered timeline shown on a PO. */
export const PO_TIMELINE_STEPS: { key: string; label: string }[] = [
  { key: "sent",      label: "Sent" },
  { key: "accepted",  label: "Accepted" },
  { key: "rejected",  label: "Rejected" },
  { key: "delivered", label: "Delivered" },
];

export interface PoStatusHistoryEntry {
  id: string;
  purchase_order_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  actor: string | null;
  created_at: string;
}

