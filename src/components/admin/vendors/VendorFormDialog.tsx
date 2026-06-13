import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { VENDOR_CATEGORIES, type Vendor } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: Vendor | null;
  onSaved: () => void;
}

const empty = (): Partial<Vendor> => ({
  name: "", category: "carpenter", contact_person: "", phone: "", email: "",
  gstin: "", address: "", payment_terms: "Net 15", rating: 0, notes: "", active: true,
});

export function VendorFormDialog({ open, onOpenChange, vendor, onSaved }: Props) {
  const [v, setV] = useState<Partial<Vendor>>(empty());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setV(vendor ? { ...vendor } : empty());
  }, [vendor, open]);

  const save = async () => {
    if (!v.name?.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const payload: any = {
      name: v.name?.trim(),
      category: v.category ?? "other",
      contact_person: v.contact_person || null,
      phone: v.phone || null,
      email: v.email || null,
      gstin: v.gstin || null,
      address: v.address || null,
      payment_terms: v.payment_terms || null,
      rating: Number(v.rating ?? 0),
      notes: v.notes || null,
      active: v.active ?? true,
    };
    const { error } = vendor
      ? await supabase.from("vendors" as any).update(payload).eq("id", vendor.id)
      : await supabase.from("vendors" as any).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(vendor ? "Vendor updated" : "Vendor added");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Name *</Label>
            <Input value={v.name ?? ""} onChange={e => setV({ ...v, name: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={v.category ?? "other"} onValueChange={x => setV({ ...v, category: x })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VENDOR_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Contact Person</Label>
            <Input value={v.contact_person ?? ""} onChange={e => setV({ ...v, contact_person: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={v.phone ?? ""} onChange={e => setV({ ...v, phone: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={v.email ?? ""} onChange={e => setV({ ...v, email: e.target.value })} />
          </div>
          <div>
            <Label>GSTIN</Label>
            <Input value={v.gstin ?? ""} onChange={e => setV({ ...v, gstin: e.target.value })} />
          </div>
          <div>
            <Label>Payment Terms</Label>
            <Input value={v.payment_terms ?? ""} placeholder="Net 15" onChange={e => setV({ ...v, payment_terms: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Address</Label>
            <Textarea rows={2} value={v.address ?? ""} onChange={e => setV({ ...v, address: e.target.value })} />
          </div>
          <div>
            <Label>Rating (0–5)</Label>
            <Input type="number" min={0} max={5} step={0.1} value={v.rating ?? 0} onChange={e => setV({ ...v, rating: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <Switch checked={v.active ?? true} onCheckedChange={c => setV({ ...v, active: c })} />
            <Label>Active</Label>
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={v.notes ?? ""} onChange={e => setV({ ...v, notes: e.target.value })} />
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
