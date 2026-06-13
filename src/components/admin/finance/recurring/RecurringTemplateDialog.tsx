import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatINR, MILESTONES } from "../types";
import type { QuotationLite } from "../types";
import type { RecurringTemplate } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quotations: QuotationLite[];
  template?: RecurringTemplate | null;
  onSaved: () => void;
}

export function RecurringTemplateDialog({ open, onOpenChange, quotations, template, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    quotation_id: template?.quotation_id ?? "",
    milestone: template?.milestone ?? "custom",
    amount: template ? String(template.amount) : "",
    gst_enabled: template?.gst_enabled ?? true,
    gst_rate: template ? String(template.gst_rate) : "18",
    frequency: template?.frequency ?? "monthly",
    next_run_date: template?.next_run_date ?? new Date().toISOString().slice(0, 10),
    notes: template?.notes ?? "",
  }));

  const save = async () => {
    if (!form.quotation_id) { toast({ title: "Select a quotation", variant: "destructive" }); return; }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { toast({ title: "Enter amount", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const quo = quotations.find(q => q.id === form.quotation_id)!;
      const milestoneLabel = MILESTONES.find(m => m.value === form.milestone)?.label ?? "Custom";
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        quotation_id: quo.id,
        lead_id: quo.lead_id,
        milestone: form.milestone,
        milestone_label: milestoneLabel,
        amount: amt,
        gst_enabled: form.gst_enabled,
        gst_rate: Number(form.gst_rate),
        frequency: form.frequency,
        next_run_date: form.next_run_date,
        notes: form.notes || null,
      };

      if (template) {
        const { error } = await supabase.from("recurring_invoice_templates").update(payload).eq("id", template.id);
        if (error) throw error;
        toast({ title: "Recurring template updated" });
      } else {
        const { error } = await supabase.from("recurring_invoice_templates").insert({ ...payload, created_by: user?.email ?? null });
        if (error) throw error;
        toast({ title: "Recurring template created" });
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{template ? "Edit" : "New"} Recurring Invoice</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Quotation *</Label>
            <Select value={form.quotation_id} onValueChange={(v) => {
              const quo = quotations.find(q => q.id === v);
              setForm(f => ({ ...f, quotation_id: v, amount: f.amount || (quo ? String(Math.round(quo.total_amount * 0.1)) : "") }));
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
              <Select value={form.milestone} onValueChange={(v) => setForm(f => ({ ...f, milestone: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MILESTONES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm(f => ({ ...f, frequency: v as RecurringTemplate["frequency"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Next run date</Label><Input type="date" value={form.next_run_date} onChange={(e) => setForm(f => ({ ...f, next_run_date: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-end gap-2">
              <input id="rgst" type="checkbox" checked={form.gst_enabled} onChange={(e) => setForm(f => ({ ...f, gst_enabled: e.target.checked }))} className="h-4 w-4" />
              <Label htmlFor="rgst" className="cursor-pointer">Apply GST</Label>
            </div>
            <div><Label>GST %</Label><Input type="number" value={form.gst_rate} disabled={!form.gst_enabled} onChange={(e) => setForm(f => ({ ...f, gst_rate: e.target.value }))} /></div>
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
