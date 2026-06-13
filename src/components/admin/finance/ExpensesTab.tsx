import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Paperclip, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatINR, EXPENSE_CATEGORIES, PAYMENT_MODES } from "./types";
import type { Expense, QuotationLite } from "./types";
import { uploadReceipt, getReceiptSignedUrl } from "./finance-utils";
import { EmptyState } from "../shared/EmptyState";

interface Props {
  expenses: Expense[];
  quotations: QuotationLite[];
  onRefresh: () => void;
  loading: boolean;
}

export function ExpensesTab({ expenses, quotations, onRefresh, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterQuo, setFilterQuo] = useState<string>("all");
  const [form, setForm] = useState({
    quotation_id: "none",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "material",
    vendor: "",
    description: "",
    amount: "",
    payment_mode: "cash",
    reference: "",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !loading) {
      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      const vendorName = params.get("vendor");
      const quotationId = params.get("quotationId");
      if (action === "log" && (vendorName || quotationId)) {
        setForm(f => ({
          ...f,
          ...(vendorName ? { vendor: decodeURIComponent(vendorName) } : {}),
          ...(quotationId ? { quotation_id: quotationId } : {}),
        }));
        setOpen(true);
        // Clean URL parameters
        const url = new URL(window.location.href);
        url.searchParams.delete("action");
        url.searchParams.delete("vendor");
        url.searchParams.delete("quotationId");
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [loading]);

  const reset = () => {
    setForm({ quotation_id: "none", expense_date: new Date().toISOString().slice(0, 10), category: "material", vendor: "", description: "", amount: "", payment_mode: "cash", reference: "" });
    setFile(null);
  };

  const save = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast({ title: "Enter amount", variant: "destructive" }); return; }
    setSaving(true);
    try {
      let receipt_url: string | null = null;
      if (file) {
        receipt_url = await uploadReceipt(file, `expenses/${form.quotation_id || "general"}`);
      }
      const quo = form.quotation_id !== "none" ? quotations.find(q => q.id === form.quotation_id) : null;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses").insert({
        quotation_id: form.quotation_id !== "none" ? form.quotation_id : null,
        lead_id: quo?.lead_id ?? null,
        expense_date: form.expense_date,
        category: form.category,
        vendor: form.vendor || null,
        description: form.description || null,
        amount: Number(form.amount),
        payment_mode: form.payment_mode,
        reference: form.reference || null,
        receipt_url,
        recorded_by: user?.email ?? null,
      });
      if (error) throw error;
      toast({ title: "Expense recorded" });
      reset(); setOpen(false); onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const openReceipt = async (path: string) => {
    const url = await getReceiptSignedUrl(path);
    if (url) window.open(url, "_blank");
  };

  const filtered = useMemo(() => filterQuo === "all" ? expenses : expenses.filter(e => e.quotation_id === filterQuo), [expenses, filterQuo]);
  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    return map;
  }, [filtered]);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold">Project Expenses</h3>
          <p className="text-xs text-muted-foreground">{filtered.length} expense(s) · Total {formatINR(total)}</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterQuo} onValueChange={setFilterQuo}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {quotations.map(q => <SelectItem key={q.id} value={q.id}>{q.quotation_number} — {q.customer_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Expense</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Project / Quotation</Label>
                  <Select value={form.quotation_id} onValueChange={(v) => setForm(f => ({ ...f, quotation_id: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">General (no project)</SelectItem>
                      {quotations.map(q => <SelectItem key={q.id} value={q.id}>{q.quotation_number} — {q.customer_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm(f => ({ ...f, expense_date: e.target.value }))} /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Vendor</Label><Input value={form.vendor} onChange={(e) => setForm(f => ({ ...f, vendor: e.target.value }))} /></div>
                  <div><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Payment Mode</Label>
                    <Select value={form.payment_mode} onValueChange={(v) => setForm(f => ({ ...f, payment_mode: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))} /></div>
                </div>
                <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div><Label>Receipt / Bill</Label><Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {Object.entries(byCategory).map(([k, v]) => (
            <Badge key={k} variant="outline" className="text-xs">{k}: {formatINR(v)}</Badge>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b">
            <tr>
              <th className="text-left py-2 px-2">Date</th>
              <th className="text-left py-2 px-2">Project</th>
              <th className="text-left py-2 px-2">Category</th>
              <th className="text-left py-2 px-2">Vendor</th>
              <th className="text-left py-2 px-2">Description</th>
              <th className="text-right py-2 px-2">Amount</th>
              <th className="text-center py-2 px-2">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</td></tr>
              : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-0">
                  <EmptyState
                    asCard={false}
                    icon={Wallet}
                    title={filterQuo !== "all" ? "No expenses for this project" : "No expenses yet"}
                    description="Log your first expense to track project spend and receipts."
                    actionLabel="Add Expense"
                    actionIcon={Plus}
                    onAction={() => setOpen(true)}
                  />
                </td></tr>
              )
                : filtered.map(e => {
                  const quo = quotations.find(q => q.id === e.quotation_id);
                  return (
                    <tr key={e.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-2">{new Date(e.expense_date).toLocaleDateString("en-IN")}</td>
                      <td className="py-2 px-2 text-xs">{quo?.quotation_number ?? "—"}</td>
                      <td className="py-2 px-2"><Badge variant="outline">{e.category}</Badge></td>
                      <td className="py-2 px-2 text-xs">{e.vendor || "—"}</td>
                      <td className="py-2 px-2 text-xs max-w-[260px] truncate">{e.description || "—"}</td>
                      <td className="py-2 px-2 text-right font-semibold">{formatINR(Number(e.amount))}</td>
                      <td className="py-2 px-2 text-center">
                        {e.receipt_url ? (
                          <Button size="sm" variant="ghost" onClick={() => openReceipt(e.receipt_url!)}><Paperclip className="w-3.5 h-3.5" /></Button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
