import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PROJECT_STATUSES, type Project } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project | null;
  onSaved: () => void;
}

interface QuotationLite {
  id: string;
  quotation_number: string;
  customer_name: string;
  total_amount: number;
  lead_id: string | null;
  project_name: string | null;
  project_location: string | null;
  project_type: string | null;
  status: string;
}
interface TeamLite { id: string; name: string; }

const empty = (): Partial<Project> => ({
  name: "", lead_id: null, quotation_id: null, project_type: "",
  site_address: "", start_date: new Date().toISOString().slice(0, 10),
  target_end_date: null, status: "planning", progress_pct: 0, budget: 0,
  project_manager: null, notes: "",
});

export function ProjectFormDialog({ open, onOpenChange, project, onSaved }: Props) {
  const [p, setP] = useState<Partial<Project>>(empty());
  const [quotations, setQuotations] = useState<QuotationLite[]>([]);
  const [team, setTeam] = useState<TeamLite[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setP(project ? { ...project } : empty());
    (async () => {
      const [q, t] = await Promise.all([
        supabase.from("quotations")
          .select("id, quotation_number, customer_name, total_amount, lead_id, project_name, project_location, project_type, status")
          .is("deleted_at", null)
          .in("status", ["approved", "sent"])
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("team_members" as any).select("id, name").eq("active", true).order("name"),
      ]);
      setQuotations((q.data ?? []) as unknown as QuotationLite[]);
      setTeam((t.data ?? []) as unknown as TeamLite[]);
    })();
  }, [open, project]);

  const pickQuotation = (qid: string) => {
    const q = quotations.find(x => x.id === qid);
    if (!q) return;
    setP(prev => ({
      ...prev,
      quotation_id: q.id,
      lead_id: q.lead_id,
      name: prev.name || q.project_name || `${q.customer_name} – Project`,
      site_address: prev.site_address || q.project_location || "",
      project_type: prev.project_type || q.project_type || "",
      budget: prev.budget || Number(q.total_amount ?? 0),
    }));
  };

  const save = async () => {
    if (!p.name?.trim()) { toast.error("Project name is required"); return; }
    setSaving(true);
    const payload: any = {
      name: p.name?.trim(),
      lead_id: p.lead_id || null,
      quotation_id: p.quotation_id || null,
      project_type: p.project_type || null,
      site_address: p.site_address || null,
      start_date: p.start_date || null,
      target_end_date: p.target_end_date || null,
      status: p.status ?? "planning",
      progress_pct: Number(p.progress_pct ?? 0),
      budget: Number(p.budget ?? 0),
      project_manager: p.project_manager || null,
      notes: p.notes || null,
    };
    const { error } = project
      ? await supabase.from("projects" as any).update(payload).eq("id", project.id)
      : await supabase.from("projects" as any).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(project ? "Project updated" : "Project created");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          {!project && (
            <div className="col-span-2">
              <Label>Link to approved quotation (optional)</Label>
              <Select value={p.quotation_id ?? "none"} onValueChange={x => x === "none" ? setP({ ...p, quotation_id: null }) : pickQuotation(x)}>
                <SelectTrigger><SelectValue placeholder="Pick a quotation to auto-fill" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {quotations.map(q => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.quotation_number} · {q.customer_name} · ₹{Number(q.total_amount).toLocaleString("en-IN")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="col-span-2">
            <Label>Project Name *</Label>
            <Input value={p.name ?? ""} onChange={e => setP({ ...p, name: e.target.value })} />
          </div>
          <div>
            <Label>Project Type</Label>
            <Input value={p.project_type ?? ""} placeholder="2BHK, Modular Kitchen…" onChange={e => setP({ ...p, project_type: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={p.status ?? "planning"} onValueChange={x => setP({ ...p, status: x })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Site Address</Label>
            <Textarea rows={2} value={p.site_address ?? ""} onChange={e => setP({ ...p, site_address: e.target.value })} />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={p.start_date ?? ""} onChange={e => setP({ ...p, start_date: e.target.value })} />
          </div>
          <div>
            <Label>Target End Date</Label>
            <Input type="date" value={p.target_end_date ?? ""} onChange={e => setP({ ...p, target_end_date: e.target.value })} />
          </div>
          <div>
            <Label>Budget (₹)</Label>
            <Input type="number" min={0} value={p.budget ?? 0} onChange={e => setP({ ...p, budget: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Progress (%)</Label>
            <Input type="number" min={0} max={100} value={p.progress_pct ?? 0} onChange={e => setP({ ...p, progress_pct: Number(e.target.value) })} />
          </div>
          <div className="col-span-2">
            <Label>Project Manager</Label>
            <Select value={p.project_manager ?? "none"} onValueChange={x => setP({ ...p, project_manager: x === "none" ? null : x })}>
              <SelectTrigger><SelectValue placeholder="Assign PM" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Unassigned —</SelectItem>
                {team.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={p.notes ?? ""} onChange={e => setP({ ...p, notes: e.target.value })} />
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
