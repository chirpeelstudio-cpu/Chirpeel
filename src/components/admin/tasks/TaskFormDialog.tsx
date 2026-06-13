import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PRIORITY_OPTIONS, TaskRecord } from "./taskHelpers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  team: { id: string; name: string }[];
  onSaved: () => void;
  initial?: Partial<TaskRecord>;
  fixedLeadId?: string | null;
  fixedProjectId?: string | null;
  meIdent?: string | null;
}

export function TaskFormDialog({ open, onOpenChange, team, onSaved, initial, fixedLeadId, fixedProjectId, meIdent }: Props) {
  const editing = !!initial?.id;
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("normal");
  const [assignee, setAssignee] = useState<string>("__unassigned");
  const [linkType, setLinkType] = useState<"none" | "lead" | "project">("none");
  const [linkId, setLinkId] = useState<string>("");
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDue(initial?.due_at ? new Date(initial.due_at).toISOString().slice(0, 16) : "");
    setPriority(initial?.priority ?? "normal");
    setAssignee(initial?.assigned_to ?? "__unassigned");
    if (fixedLeadId || initial?.lead_id) { setLinkType("lead"); setLinkId(fixedLeadId ?? initial?.lead_id ?? ""); }
    else if (fixedProjectId || initial?.project_id) { setLinkType("project"); setLinkId(fixedProjectId ?? initial?.project_id ?? ""); }
    else { setLinkType("none"); setLinkId(""); }
  }, [open, initial, fixedLeadId, fixedProjectId]);

  useEffect(() => {
    if (!open || fixedLeadId || fixedProjectId) return;
    (async () => {
      const [{ data: ld }, { data: pj }] = await Promise.all([
        supabase.from("leads").select("id, name").is("deleted_at", null).order("created_at", { ascending: false }).limit(100),
        (supabase.from("projects" as any) as any).select("id, name").order("created_at", { ascending: false }).limit(100),
      ]);
      setLeads((ld ?? []) as any);
      setProjects((pj ?? []) as any);
    })();
  }, [open, fixedLeadId, fixedProjectId]);

  const save = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const payload: any = {
      title: title.trim(),
      due_at: due ? new Date(due).toISOString() : null,
      priority,
      assigned_to: assignee === "__unassigned" ? null : assignee,
      lead_id: linkType === "lead" ? (linkId || null) : null,
      project_id: linkType === "project" ? (linkId || null) : null,
    };
    if (!editing) payload.created_by = meIdent ?? null;
    const q = editing
      ? supabase.from("tasks" as any).update(payload).eq("id", initial!.id!)
      : supabase.from("tasks" as any).insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Task updated" : "Task created");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Call client about quote" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Due</Label>
              <Input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned">Unassigned</SelectItem>
                {meIdent && <SelectItem value={meIdent}>Me ({meIdent})</SelectItem>}
                {team.filter(m => m.name !== meIdent).map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!fixedLeadId && !fixedProjectId && (
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <div>
                <Label className="text-xs">Link to</Label>
                <Select value={linkType} onValueChange={v => { setLinkType(v as any); setLinkId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {linkType !== "none" && (
                <div>
                  <Label className="text-xs">{linkType === "lead" ? "Lead" : "Project"}</Label>
                  <Select value={linkId} onValueChange={setLinkId}>
                    <SelectTrigger><SelectValue placeholder={`Select ${linkType}`} /></SelectTrigger>
                    <SelectContent>
                      {(linkType === "lead" ? leads : projects).map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !title.trim()}>{editing ? "Save" : "Create task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}