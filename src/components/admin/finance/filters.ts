import type { Invoice, Payment, Expense } from "./types";

export type DateRangePreset = "this_month" | "last_month" | "this_fy" | "last_30" | "all" | "custom";

export type InvoiceStatusFilter = "all" | "draft" | "issued" | "paid" | "overdue" | "cancelled";

export interface FinanceFilters {
  preset: DateRangePreset;
  from: string | null; // ISO YYYY-MM-DD
  to: string | null;
  quotationId: string; // "all" or quotation id
  search: string;
  status: InvoiceStatusFilter;
  amountMin: number | null;
  amountMax: number | null;
}

export const DEFAULT_FILTERS: FinanceFilters = {
  preset: "this_month",
  from: null,
  to: null,
  quotationId: "all",
  search: "",
  status: "all",
  amountMin: null,
  amountMax: null,
};

export const STATUS_LABELS: Record<InvoiceStatusFilter, string> = {
  all: "All statuses",
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

function fyStart(d: Date) {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(y, 3, 1); // April 1
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function resolveRange(f: FinanceFilters): { from: string | null; to: string | null } {
  const today = new Date();
  switch (f.preset) {
    case "this_month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: fmt(from), to: fmt(today) };
    }
    case "last_month": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: fmt(from), to: fmt(to) };
    }
    case "this_fy": {
      return { from: fmt(fyStart(today)), to: fmt(today) };
    }
    case "last_30": {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      return { from: fmt(from), to: fmt(today) };
    }
    case "custom":
      return { from: f.from, to: f.to };
    case "all":
    default:
      return { from: null, to: null };
  }
}

function inRange(date: string, from: string | null, to: string | null) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function matchSearch(haystack: (string | null | undefined)[], needle: string) {
  if (!needle) return true;
  const q = needle.toLowerCase().trim();
  return haystack.some(h => (h || "").toLowerCase().includes(q));
}

function inAmount(amount: number, min: number | null, max: number | null) {
  if (min != null && amount < min) return false;
  if (max != null && amount > max) return false;
  return true;
}

export function applyInvoiceFilters(invoices: Invoice[], f: FinanceFilters): Invoice[] {
  const { from, to } = resolveRange(f);
  return invoices.filter(i => {
    if (!inRange(i.issue_date, from, to)) return false;
    if (f.quotationId !== "all" && i.quotation_id !== f.quotationId) return false;
    if (f.status !== "all" && i.status !== f.status) return false;
    if (!inAmount(Number(i.total_amount || 0), f.amountMin, f.amountMax)) return false;
    if (!matchSearch([i.invoice_number, i.customer_name, i.customer_phone, i.customer_email, i.notes], f.search)) return false;
    return true;
  });
}

export function applyPaymentFilters(payments: Payment[], f: FinanceFilters): Payment[] {
  const { from, to } = resolveRange(f);
  return payments.filter(p => {
    if (!inRange(p.paid_on, from, to)) return false;
    if (f.quotationId !== "all" && p.quotation_id !== f.quotationId) return false;
    if (!inAmount(Number(p.amount || 0), f.amountMin, f.amountMax)) return false;
    if (!matchSearch([p.reference, p.notes, p.mode, p.milestone], f.search)) return false;
    return true;
  });
}

export function applyExpenseFilters(expenses: Expense[], f: FinanceFilters): Expense[] {
  const { from, to } = resolveRange(f);
  return expenses.filter(e => {
    if (!inRange(e.expense_date, from, to)) return false;
    if (f.quotationId !== "all" && e.quotation_id !== f.quotationId) return false;
    if (!inAmount(Number(e.amount || 0), f.amountMin, f.amountMax)) return false;
    if (!matchSearch([e.vendor, e.description, e.category, e.reference], f.search)) return false;
    return true;
  });
}

export const PRESET_LABELS: Record<DateRangePreset, string> = {
  this_month: "This month",
  last_month: "Last month",
  this_fy: "This FY",
  last_30: "Last 30 days",
  all: "All time",
  custom: "Custom",
};
