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
import { Plus, Paperclip, Loader2, Download, Wallet, MoreVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatINR, PAYMENT_MODES, MILESTONES } from "./types";
import type { Payment, QuotationLite, Invoice } from "./types";
import { uploadReceipt, getReceiptSignedUrl } from "./finance-utils";
import { exportPaymentsCSV } from "./export-utils";
import { EmptyState } from "../shared/EmptyState";
import { MobileActionSheet, type MobileSheetAction } from "../shared/MobileActionSheet";

interface Props {
  payments: Payment[];
  quotations: QuotationLite[];
  invoices: Invoice[];
  onRefresh: () => void;
  loading: boolean;
}

export function PaymentsTab({ payments, quotations, invoices, onRefresh, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheetFor, setSheetFor] = useState<Payment | null>(null);
  const [form, setForm] = useState({
    quotation_id: "" as string,
    invoice_id: "none" as string,
    paid_on: new Date().toISOString().slice(0, 10),
    amount: "",
    mode: "upi",
    reference: "",
    milestone: "10",
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !loading) {
      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      const leadId = params.get("leadId");
      if (action === "record" && leadId) {
        const matchingQuo = quotations.find(q => q.lead_id === leadId);
        if (matchingQuo) {
          setForm(f => ({
            ...f,
            quotation_id: matchingQuo.id,
            amount: "",
          }));
          setOpen(true);
        } else {
          toast({
            title: "No quotation found",
            description: "To record a payment, the lead must have an associated quotation.",
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

  const reset = () => {
    setForm({ quotation_id: "", invoice_id: "none", paid_on: new Date().toISOString().slice(0, 10), amount: "", mode: "upi", reference: "", milestone: "10", notes: "" });
    setFile(null);
  };

  const save = async () => {
    if (!form.quotation_id) { toast({ title: "Select a quotation", variant: "destructive" }); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setSaving(true);
    try {
      let receipt_url: string | null = null;
      if (file) {
        receipt_url = await uploadReceipt(file, `payments/${form.quotation_id}`);
        if (!receipt_url) { toast({ title: "Receipt upload failed", variant: "destructive" }); setSaving(false); return; }
      }
      const quo = quotations.find(q => q.id === form.quotation_id);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("payments").insert({
        quotation_id: form.quotation_id,
        invoice_id: form.invoice_id && form.invoice_id !== "none" ? form.invoice_id : null,
        lead_id: quo?.lead_id ?? null,
        paid_on: form.paid_on,
        amount: Number(form.amount),
        mode: form.mode,
        reference: form.reference || null,
        milestone: form.milestone || null,
        notes: form.notes || null,
        receipt_url,
        recorded_by: user?.email ?? null,
      });
      if (error) throw error;

      if (form.invoice_id && form.invoice_id !== "none") {
        const inv = invoices.find(i => i.id === form.invoice_id);
        if (inv) {
          const newPaid = Number(inv.paid_amount || 0) + Number(form.amount);
          const fullyPaid = newPaid >= Number(inv.total_amount);
          await supabase.from("invoices").update({
            paid_amount: newPaid,
            status: fullyPaid ? "paid" : inv.status,
            paid_on: fullyPaid ? form.paid_on : null,
          }).eq("id", form.invoice_id);
        }
      }

      toast({ title: "Payment recorded" });
      reset();
      setOpen(false);
      onRefresh();
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const openReceipt = async (path: string) => {
    const url = await getReceiptSignedUrl(path);
    if (url) window.open(url, "_blank");
    else toast({ title: "Could not load receipt", variant: "destructive" });
  };

  const filteredInvoices = invoices.filter(i => !form.quotation_id || i.quotation_id === form.quotation_id);

  const sheetActions: MobileSheetAction[] = sheetFor ? [
    ...(sheetFor.receipt_url ? [{
      key: "receipt",
      label: "View receipt",
      icon: Paperclip,
      onSelect: () => openReceipt(sheetFor.receipt_url!),
    }] : []),
  ] : [];

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex justify-between items-start sm:items-center mb-3 gap-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm sm:text-base">Payment Ledger</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">{payments.length} payment(s) · Total {formatINR(payments.reduce((s, p) => s + Number(p.amount), 0))}</p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => exportPaymentsCSV(payments)} disabled={payments.length === 0} className="h-8" title="Export CSV">
            <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline ml-1">CSV</span>
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8"><Plus className="w-3.5 h-3.5 mr-1" /> <span>Record</span></Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Quotation *</Label>
                  <Select value={form.quotation_id} onValueChange={(v) => setForm(f => ({ ...f, quotation_id: v, invoice_id: "none" }))}>
                    <SelectTrigger><SelectValue placeholder="Select quotation" /></SelectTrigger>
                    <SelectContent>
                      {quotations.map(q => (
                        <SelectItem key={q.id} value={q.id}>{q.quotation_number} — {q.customer_name} ({formatINR(q.total_amount)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Apply to Invoice (optional)</Label>
                  <Select value={form.invoice_id} onValueChange={(v) => setForm(f => ({ ...f, invoice_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="No invoice" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No invoice</SelectItem>
                      {filteredInvoices.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.invoice_number} ({formatINR(i.total_amount)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={form.paid_on} onChange={(e) => setForm(f => ({ ...f, paid_on: e.target.value }))} /></div>
                  <div><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Mode</Label>
                    <Select value={form.mode} onValueChange={(v) => setForm(f => ({ ...f, mode: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Milestone</Label>
                    <Select value={form.milestone} onValueChange={(v) => setForm(f => ({ ...f, milestone: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{MILESTONES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Reference (txn id / cheque no)</Label><Input value={form.reference} onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))} /></div>
                <div><Label>Receipt Attachment</Label><Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
                <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-8 text-sm text-muted-foreground">Loading…</p>
      ) : payments.length === 0 ? (
        <EmptyState
          asCard={false}
          icon={Wallet}
          title="No payments yet"
          description="Record your first customer payment to start the ledger."
          actionLabel="Record Payment"
          actionIcon={Plus}
          onAction={() => setOpen(true)}
        />
      ) : (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {payments.map(p => {
              const quo = quotations.find(q => q.id === p.quotation_id);
              return (
                <div key={p.id} className="border rounded-lg p-3 hover:bg-muted/30">
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{quo?.customer_name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{quo?.quotation_number} · {new Date(p.paid_on).toLocaleDateString("en-IN")}</div>
                    </div>
                    <div className="text-base font-bold text-emerald-600 shrink-0">{formatINR(Number(p.amount))}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge variant="outline" className="text-[10px]">{p.mode.toUpperCase()}</Badge>
                      {p.milestone && <Badge variant="outline" className="text-[10px]">{p.milestone}%</Badge>}
                      {p.reference && <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">#{p.reference}</span>}
                    </div>
                    {p.receipt_url ? (
                      <Button size="sm" variant="ghost" onClick={() => setSheetFor(p)} className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Quotation</th>
                  <th className="text-left py-2 px-2">Mode</th>
                  <th className="text-left py-2 px-2">Reference</th>
                  <th className="text-left py-2 px-2">Milestone</th>
                  <th className="text-right py-2 px-2">Amount</th>
                  <th className="text-center py-2 px-2">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const quo = quotations.find(q => q.id === p.quotation_id);
                  return (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-2">{new Date(p.paid_on).toLocaleDateString("en-IN")}</td>
                      <td className="py-2 px-2">
                        <div className="font-medium">{quo?.quotation_number ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{quo?.customer_name}</div>
                      </td>
                      <td className="py-2 px-2"><Badge variant="outline">{p.mode.toUpperCase()}</Badge></td>
                      <td className="py-2 px-2 text-xs">{p.reference || "—"}</td>
                      <td className="py-2 px-2 text-xs">{p.milestone ? `${p.milestone}%` : "—"}</td>
                      <td className="py-2 px-2 text-right font-semibold">{formatINR(Number(p.amount))}</td>
                      <td className="py-2 px-2 text-center">
                        {p.receipt_url ? (
                          <Button size="sm" variant="ghost" onClick={() => openReceipt(p.receipt_url!)}>
                            <Paperclip className="w-3.5 h-3.5" />
                          </Button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <MobileActionSheet
        open={!!sheetFor}
        onOpenChange={(o) => { if (!o) setSheetFor(null); }}
        title={sheetFor ? `Payment ${formatINR(Number(sheetFor.amount))}` : ""}
        description={sheetFor ? `${sheetFor.mode.toUpperCase()} · ${new Date(sheetFor.paid_on).toLocaleDateString("en-IN")}` : ""}
        actions={sheetActions}
      />
    </Card>
  );
}
