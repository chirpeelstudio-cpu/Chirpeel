import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PO_STATUSES, type PurchaseOrder, type Vendor } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  po: PurchaseOrder | null;
  vendors: Vendor[];
  projects: { id: string; name: string }[];
  onSaved: () => void;
}

const empty = (): Partial<PurchaseOrder> => ({
  vendor_id: "", project_id: null, po_date: new Date().toISOString().slice(0, 10),
  amount: 0, gst_amount: 0, total_amount: 0, status: "draft", description: "", attachment_url: "",
});

export function PurchaseOrderFormDialog({ open, onOpenChange, po, vendors, projects, onSaved }: Props) {
  const [p, setP] = useState<Partial<PurchaseOrder>>(empty());
  const [gstRate, setGstRate] = useState(18);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (po) {
      setP({ ...po });
      const amt = Number(po.amount) || 0;
      setGstRate(amt > 0 ? Math.round((Number(po.gst_amount) / amt) * 100) : 18);
    } else {
      setP({ ...empty(), vendor_id: vendors[0]?.id ?? "" });
      setGstRate(18);
    }
  }, [po, open, vendors]);

  const computed = useMemo(() => {
    const amt = Number(p.amount ?? 0);
    const gst = Math.round(amt * (gstRate / 100));
    return { amount: amt, gst, total: amt + gst };
  }, [p.amount, gstRate]);

  const save = async () => {
    if (!p.vendor_id) { toast.error("Vendor is required"); return; }
    if (!computed.amount) { toast.error("Amount is required"); return; }
    setSaving(true);
    const payload: any = {
      vendor_id: p.vendor_id,
      project_id: p.project_id || null,
      po_date: p.po_date,
      amount: computed.amount,
      gst_amount: computed.gst,
      total_amount: computed.total,
      status: p.status ?? "draft",
      description: p.description || null,
      attachment_url: p.attachment_url || null,
    };
    const { error } = po
      ? await supabase.from("purchase_orders" as any).update(payload).eq("id", po.id)
      : await supabase.from("purchase_orders" as any).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(po ? "PO updated" : "PO created");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{po ? `Edit ${po.po_number}` : "New Purchase Order"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Vendor *</Label>
            <Select value={p.vendor_id ?? ""} onValueChange={x => setP({ ...p, vendor_id: x })}>
              <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Project (optional)</Label>
            <Select value={p.project_id ?? "none"} onValueChange={x => setP({ ...p, project_id: x === "none" ? null : x })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {projects.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>PO Date</Label>
            <Input type="date" value={p.po_date ?? ""} onChange={e => setP({ ...p, po_date: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={p.status ?? "draft"} onValueChange={x => setP({ ...p, status: x })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PO_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount (₹)</Label>
            <Input type="number" min={0} value={p.amount ?? 0} onChange={e => setP({ ...p, amount: Number(e.target.value) })} />
          </div>
          <div>
            <Label>GST Rate (%)</Label>
            <Input type="number" min={0} max={28} value={gstRate} onChange={e => setGstRate(Number(e.target.value))} />
          </div>
          <div className="col-span-2 grid grid-cols-3 gap-2 text-xs bg-muted/30 rounded p-2">
            <div><span className="text-muted-foreground">Subtotal: </span><span className="font-semibold">₹{computed.amount.toLocaleString("en-IN")}</span></div>
            <div><span className="text-muted-foreground">GST: </span><span className="font-semibold">₹{computed.gst.toLocaleString("en-IN")}</span></div>
            <div><span className="text-muted-foreground">Total: </span><span className="font-bold text-foreground">₹{computed.total.toLocaleString("en-IN")}</span></div>
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={p.description ?? ""} onChange={e => setP({ ...p, description: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Attachment URL</Label>
            <Input value={p.attachment_url ?? ""} placeholder="https://…" onChange={e => setP({ ...p, attachment_url: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
