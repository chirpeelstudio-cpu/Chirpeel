import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Invoice, Payment, Expense } from "./types";
import { ageBucket } from "./finance-utils";

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-IN");

function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows
    .map(r =>
      r
        .map(cell => {
          if (cell === null || cell === undefined) return "";
          const s = String(cell);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportInvoicesCSV(invoices: Invoice[]) {
  const header = ["Invoice #", "Customer", "Phone", "Email", "Milestone", "Issue Date", "Due Date", "Amount", "GST", "Total", "Paid", "Status"];
  const rows: (string | number | null | undefined)[][] = [header];
  invoices.forEach(i => {
    rows.push([
      i.invoice_number,
      i.customer_name,
      i.customer_phone,
      i.customer_email,
      i.milestone_label,
      i.issue_date,
      i.due_date,
      i.amount,
      i.gst_amount,
      i.total_amount,
      i.paid_amount,
      i.status,
    ]);
  });
  downloadCSV(`invoices-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportPaymentsCSV(payments: Payment[]) {
  const header = ["Date", "Amount", "Mode", "Reference", "Milestone", "Quotation", "Notes"];
  const rows: (string | number | null | undefined)[][] = [header];
  payments.forEach(p => {
    rows.push([p.paid_on, p.amount, p.mode, p.reference, p.milestone, p.quotation_id, p.notes]);
  });
  downloadCSV(`payments-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportExpensesCSV(expenses: Expense[]) {
  const header = ["Date", "Category", "Vendor", "Description", "Amount", "Mode", "Reference", "Project"];
  const rows: (string | number | null | undefined)[][] = [header];
  expenses.forEach(e => {
    rows.push([e.expense_date, e.category, e.vendor, e.description, e.amount, e.payment_mode, e.reference, e.quotation_id]);
  });
  downloadCSV(`expenses-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportAgingCSV(invoices: Invoice[]) {
  const header = ["Invoice #", "Customer", "Phone", "Due Date", "Bucket", "Outstanding", "Reminders Sent"];
  const rows: (string | number | null | undefined)[][] = [header];
  invoices.forEach(i => {
    const out = Number(i.total_amount) - Number(i.paid_amount);
    rows.push([i.invoice_number, i.customer_name, i.customer_phone, i.due_date, ageBucket(i.due_date), out, i.reminder_count]);
  });
  downloadCSV(`aging-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

interface CompanyBranding {
  company_name?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export function exportAgingPDF(invoices: Invoice[], company: CompanyBranding | null) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 44, 95);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(company?.company_name || "Chirpeel Interiors", 40, 32);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(company?.tagline || "Premium Interiors", 40, 50);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Accounts Receivable Aging Report", pageW - 40, 32, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`, pageW - 40, 50, { align: "right" });

  doc.setTextColor(0, 0, 0);

  // Bucket summary
  const buckets = { current: 0, "0-30": 0, "31-60": 0, "60+": 0 } as Record<string, number>;
  const counts = { current: 0, "0-30": 0, "31-60": 0, "60+": 0 } as Record<string, number>;
  invoices.forEach(i => {
    const out = Number(i.total_amount) - Number(i.paid_amount);
    const b = ageBucket(i.due_date);
    buckets[b] += out;
    counts[b] += 1;
  });
  const totalOut = Object.values(buckets).reduce((a, b) => a + b, 0);

  autoTable(doc, {
    startY: 90,
    head: [["Bucket", "Invoices", "Outstanding (₹)"]],
    body: [
      ["Current (not yet due)", counts.current, fmtINR(buckets.current)],
      ["0–30 days overdue", counts["0-30"], fmtINR(buckets["0-30"])],
      ["31–60 days overdue", counts["31-60"], fmtINR(buckets["31-60"])],
      ["60+ days overdue", counts["60+"], fmtINR(buckets["60+"])],
      [{ content: "Total", styles: { fontStyle: "bold" } }, { content: invoices.length, styles: { fontStyle: "bold" } }, { content: fmtINR(totalOut), styles: { fontStyle: "bold" } }],
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 44, 95], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } },
  });

  // Detail table
  const sorted = [...invoices].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20,
    head: [["Invoice #", "Customer", "Due Date", "Bucket", "Outstanding (₹)", "Reminders"]],
    body: sorted.map(i => [
      i.invoice_number,
      i.customer_name,
      fmtDate(i.due_date),
      ageBucket(i.due_date),
      { content: fmtINR(Number(i.total_amount) - Number(i.paid_amount)), styles: { halign: "right" } },
      { content: String(i.reminder_count || 0), styles: { halign: "center" } },
    ]),
    theme: "striped",
    headStyles: { fillColor: [15, 44, 95], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    didDrawPage: () => {
      // Footer on each page
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120);
      const footerLine = [company?.phone, company?.email, company?.website].filter(Boolean).join("  ·  ");
      if (footerLine) doc.text(footerLine, pageW / 2, h - 20, { align: "center" });
    },
  });

  doc.save(`aging-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
