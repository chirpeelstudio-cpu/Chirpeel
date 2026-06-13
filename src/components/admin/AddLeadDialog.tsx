import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import UpgradeGate from "@/components/billing/UpgradeGate";

interface Props {
  onLeadAdded: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const PROJECT_TYPES = [
  "1 BHK", "2 BHK", "3 BHK", "4 BHK", "Villa", "Duplex", "Penthouse", "Commercial", "Other"
];

const BUDGET_RANGES = [
  "Under ₹5 Lakh", "₹5-10 Lakh", "₹10-15 Lakh", "₹15-25 Lakh", "₹25-50 Lakh", "₹50 Lakh+"
];

const TIMELINE_OPTIONS = [
  "Immediate", "1-2 Months", "2-3 Months", "3-6 Months", "6+ Months"
];

const SOURCE_OPTIONS = [
  { value: "walk_in", label: "Walk-in" },
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "referral", label: "Referral" },
  { value: "bni_referral", label: "BNI Referral" },
];

const AddLeadDialog = ({ onLeadAdded, open: openProp, onOpenChange, hideTrigger }: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (v: boolean) => { onOpenChange ? onOpenChange(v) : setInternalOpen(v); };
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    pincode: "",
    project_type: "",
    budget: "",
    timeline: "",
    source: "",
    details: "",
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and Phone are required");
      return;
    }
    if (form.phone.trim().length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      city: form.city.trim() || null,
      pincode: form.pincode.trim() || null,
      project_type: form.project_type || null,
      budget: form.budget || null,
      timeline: form.timeline || null,
      details: form.details.trim() || null,
      source: form.source || "walk_in",
      stage: "leads",
      status: "New Lead",
    });
    setSaving(false);

    if (error) {
      toast.error("Failed to add lead");
    } else {
      toast.success("Lead added successfully!");
      setForm({ name: "", phone: "", email: "", city: "", pincode: "", project_type: "", budget: "", timeline: "", source: "", details: "" });
      setOpen(false);
      onLeadAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <UpgradeGate kind="lead">
          <Button size="sm" className="gap-1.5 px-2 sm:px-3" onClick={() => setOpen(true)}>
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </Button>
        </UpgradeGate>
      )}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Walk-in Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Required fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="walkin-name">Name <span className="text-destructive">*</span></Label>
              <Input id="walkin-name" placeholder="Customer name" value={form.name} onChange={e => update("name", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="walkin-phone">Phone <span className="text-destructive">*</span></Label>
              <Input id="walkin-phone" placeholder="10-digit number" value={form.phone} onChange={e => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walkin-email">Email</Label>
            <Input id="walkin-email" type="email" placeholder="customer@email.com" value={form.email} onChange={e => update("email", e.target.value)} maxLength={255} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="walkin-city">City</Label>
              <Input id="walkin-city" placeholder="City" value={form.city} onChange={e => update("city", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="walkin-pincode">Pincode</Label>
              <Input id="walkin-pincode" placeholder="Pincode" value={form.pincode} onChange={e => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Project Type</Label>
              <Select value={form.project_type} onValueChange={v => update("project_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => update("source", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Budget</Label>
              <Select value={form.budget} onValueChange={v => update("budget", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Timeline</Label>
              <Select value={form.timeline} onValueChange={v => update("timeline", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {TIMELINE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walkin-details">Requirements / Notes</Label>
            <Textarea id="walkin-details" placeholder="Customer requirements, preferences, notes…" value={form.details} onChange={e => update("details", e.target.value)} maxLength={1000} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadDialog;
