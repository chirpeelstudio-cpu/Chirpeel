import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, MessageCircle, Mail, FileText, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatINR, MILESTONES } from "./types";
import type { Invoice, QuotationLite, Payment } from "./types";
import { buildWhatsAppLink, reminderMessage } from "./finance-utils";
import { EmptyState } from "../shared/EmptyState";
import { exportInvoicesCSV } from "./export-utils";
import { RecurringInvoicesPanel } from "./recurring/RecurringInvoicesPanel";

interface Props {
  invoices: Invoice[];
  quotations: QuotationLite[];
  payments: Payment[];
  onRefresh: () => void;
  loading: boolean;
}

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary", issued: "default", paid: "default", overdue: "destructive", cancelled: "outline",
};

export function InvoicesTab({ invoices, quotations, payments, onRefresh, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    quotation_id: "",
    milestone: "10",
    amount: "",
    gst_enabled: true,
    gst_rate: "18",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    if (typeof window !== "undefined" && !loading) {
      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      const leadId = params.get("leadId");
      if (action === "generate" && leadId) {
        const matchingQuo = quotations.find(q => q.lead_id === leadId);
        if (matchingQuo) {
          setForm(f => ({
            ...f,
            quotation_id: matchingQuo.id,
            milestone: "10",
            amount: String(Math.round(matchingQuo.total_amount * 0.1)),
          }));
          setOpen(true);
        } else {
          toast({
            title: "No quotation found",
            description: "To generate an invoice, the lead must have an associated quotation.",
            variant: "destructive"
          });
        }
        // Clean URL parameters
        const url = new URL(window.location.href);
        url.searchParams.delete("action");
        url.searchParams.delete("leadId");
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [quotations, loading]);

  const reset = () => setForm({
    quotation_id: "", milestone: "10", amount: "", gst_enabled: true, gst_rate: "18",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    notes: "",
  });

  const create = async () => {
    if (!form.quotation_id) { toast({ title: "Select a quotation", variant: "destructive" }); return; }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { toast({ title: "Enter amount", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const quo = quotations.find(q => q.id === form.quotation_id)!;
      const gstAmount = form.gst_enabled ? (amt * Number(form.gst_rate)) / 100 : 0;
      const total = amt + gstAmount;
      const milestoneLabel = MILESTONES.find(m => m.value === form.milestone)?.label ?? "Custom";
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("invoices").insert({
        invoice_number: "",  // trigger fills
        quotation_id: quo.id,
        lead_id: quo.lead_id,
        customer_name: quo.customer_name,
        customer_email: quo.customer_email,
        customer_phone: quo.customer_phone,
        milestone: form.milestone,
        milestone_label: milestoneLabel,
        amount: amt,
        gst_enabled: form.gst_enabled,
        gst_rate: Number(form.gst_rate),
        gst_amount: gstAmount,
        total_amount: total,
        issue_date: form.issue_date,
        due_date: form.due_date,
        status: "issued",
        notes: form.notes || null,
        created_by: user?.email ?? null,
      });
      if (error) throw error;
      toast({ title: "Invoice created" });
      reset();
      setOpen(false);
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const sendEmailReminder = async (inv: Invoice) => {
    if (!inv.customer_email) { toast({ title: "No email on record", variant: "destructive" }); return; }
    try {
      const { error } = await supabase.functions.invoke("send-payment-reminder", {
        body: { invoice_id: inv.id, manual: true },
      });
      if (error) throw error;
      toast({ title: "Email reminder sent" });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Email reminder failed", description: e.message, variant: "destructive" });
    }
  };

  const cancelInvoice = async (inv: Invoice) => {
    if (!confirm(`Cancel invoice ${inv.invoice_number}?`)) return;
    const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", inv.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Invoice cancelled" }); onRefresh(); }
  };

  return (
    <div className="space-y-4">
    <Card className="p-3 sm:p-4">
      <div className="flex justify-between items-start sm:items-center mb-3 gap-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm sm:text-base">Invoices</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">{invoices.length} invoice(s)</p>
        </div>
        <div className="flex gap-1.5">
        <Button size="sm" variant="outline" onClick={() => exportInvoicesCSV(invoices)} disabled={invoices.length === 0} className="h-8" title="Export CSV">
          <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline ml-1">CSV</span>
        </Button>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8"><Plus className="w-3.5 h-3.5 mr-1" /> Generate</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Generate Invoice</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Quotation *</Label>
                <Select value={form.quotation_id} onValueChange={(v) => {
                  const quo = quotations.find(q => q.id === v);
                  setForm(f => ({ ...f, quotation_id: v, amount: quo ? String(Math.round(quo.total_amount * 0.1)) : "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select quotation" /></SelectTrigger>
                  <SelectContent>
                    {quotations.map(q => (
                      <SelectItem key={q.id} value={q.id}>{q.quotation_number} — {q.customer_name} ({formatINR(q.total_amount)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Milestone</Label>
                  <Select value={form.milestone} onValueChange={(v) => {
                    const quo = quotations.find(q => q.id === form.quotation_id);
                    let amount = form.amount;
                    if (quo) {
                      if (v === "10") amount = String(Math.round(quo.total_amount * 0.1));
                      else if (v === "50") amount = String(Math.round(quo.total_amount * 0.5));
                      else if (v === "40") amount = String(Math.round(quo.total_amount * 0.4));
                    }
                    setForm(f => ({ ...f, milestone: v, amount }));
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MILESTONES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-end gap-2">
                  <input id="gst" type="checkbox" checked={form.gst_enabled} onChange={(e) => setForm(f => ({ ...f, gst_enabled: e.target.checked }))} className="h-4 w-4" />
                  <Label htmlFor="gst" className="cursor-pointer">Apply GST</Label>
                </div>
                <div><Label>GST %</Label><Input type="number" value={form.gst_rate} disabled={!form.gst_enabled} onChange={(e) => setForm(f => ({ ...f, gst_rate: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm(f => ({ ...f, issue_date: e.target.value }))} /></div>
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              {form.amount && (
                <div className="text-xs bg-muted/50 rounded p-2">
                  Subtotal: {formatINR(Number(form.amount))} {form.gst_enabled && <>· GST: {formatINR((Number(form.amount) * Number(form.gst_rate)) / 100)}</>} · <strong>Total: {formatINR(Number(form.amount) + (form.gst_enabled ? (Number(form.amount) * Number(form.gst_rate)) / 100 : 0))}</strong>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Generate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b">
            <tr>
              <th className="text-left py-2 px-2">Invoice #</th>
              <th className="text-left py-2 px-2">Customer</th>
              <th className="text-left py-2 px-2">Milestone</th>
              <th className="text-left py-2 px-2">Issued</th>
              <th className="text-left py-2 px-2">Due</th>
              <th className="text-right py-2 px-2">Amount</th>
              <th className="text-right py-2 px-2">Paid</th>
              <th className="text-center py-2 px-2">Status</th>
              <th className="text-center py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="text-center py-6 text-muted-foreground">Loading…</td></tr>
              : invoices.length === 0 ? (
                <tr><td colSpan={9} className="p-0">
                  <EmptyState
                    asCard={false}
                    icon={FileText}
                    title="No invoices yet"
                    description="Generate your first milestone invoice from a quotation."
                    actionLabel={quotations.length === 0 ? undefined : "Generate Invoice"}
                    actionIcon={Plus}
                    onAction={quotations.length === 0 ? undefined : () => setOpen(true)}
                  />
                </td></tr>
              )
                : invoices.map(i => (
                  <tr key={i.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-2 font-mono text-xs">{i.invoice_number}</td>
                    <td className="py-2 px-2">
                      <div className="font-medium">{i.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{i.customer_phone}</div>
                    </td>
                    <td className="py-2 px-2 text-xs">{i.milestone_label || "—"}</td>
                    <td className="py-2 px-2 text-xs">{new Date(i.issue_date).toLocaleDateString("en-IN")}</td>
                    <td className="py-2 px-2 text-xs">{new Date(i.due_date).toLocaleDateString("en-IN")}</td>
                    <td className="py-2 px-2 text-right">{formatINR(Number(i.total_amount))}</td>
                    <td className="py-2 px-2 text-right text-emerald-600">{formatINR(Number(i.paid_amount))}</td>
                    <td className="py-2 px-2 text-center"><Badge variant={statusColor[i.status]}>{i.status}</Badge></td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1 justify-center">
                        {(i.status === "issued" || i.status === "overdue") && (
                          <>
                            <Button size="sm" variant="ghost" title="Email reminder" onClick={() => sendEmailReminder(i)}>
                              <Mail className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" title="WhatsApp reminder" asChild>
                              <a href={buildWhatsAppLink(i.customer_phone, reminderMessage(i))} target="_blank" rel="noreferrer">
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                            <Button size="sm" variant="ghost" title="Cancel" onClick={() => cancelInvoice(i)}>✕</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </Card>

    <RecurringInvoicesPanel quotations={quotations} onInvoiceGenerated={onRefresh} />
    </div>
  );
}
