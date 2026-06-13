export interface Payment {
  id: string;
  quotation_id: string | null;
  lead_id: string | null;
  invoice_id: string | null;
  paid_on: string;
  amount: number;
  mode: string;
  reference: string | null;
  milestone: string | null;
  receipt_url: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  quotation_id: string | null;
  lead_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  milestone: string | null;
  milestone_label: string | null;
  amount: number;
  gst_enabled: boolean;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  issue_date: string;
  due_date: string;
  status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
  paid_amount: number;
  paid_on: string | null;
  pdf_url: string | null;
  notes: string | null;
  last_reminder_at: string | null;
  reminder_count: number;
  created_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  quotation_id: string | null;
  lead_id: string | null;
  expense_date: string;
  category: string;
  vendor: string | null;
  description: string | null;
  amount: number;
  payment_mode: string | null;
  reference: string | null;
  receipt_url: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface QuotationLite {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  project_name: string | null;
  total_amount: number;
  lead_id: string | null;
  status: string;
}

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export const PAYMENT_MODES = [
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export const EXPENSE_CATEGORIES = [
  { value: "material", label: "Material" },
  { value: "labour", label: "Labour" },
  { value: "transport", label: "Transport" },
  { value: "overhead", label: "Overhead" },
  { value: "other", label: "Other" },
];

export const MILESTONES = [
  { value: "10", label: "Booking 10%" },
  { value: "50", label: "Production 50%" },
  { value: "40", label: "Delivery 40%" },
  { value: "custom", label: "Custom" },
];
