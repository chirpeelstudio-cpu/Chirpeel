import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import type { ProjectMilestone } from "./types";

export function ProjectMilestones({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ProjectMilestone[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase.from("project_milestones" as any)
      .select("*").eq("project_id", projectId).order("sort_order");
    setItems((data ?? []) as unknown as ProjectMilestone[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  const add = async () => {
    if (!title.trim()) return;
    const sort_order = (items[items.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await supabase.from("project_milestones" as any)
      .insert({ project_id: projectId, title: title.trim(), target_date: date || null, sort_order });
    if (error) toast.error(error.message);
    else { setTitle(""); setDate(""); fetchAll(); }
  };

  const toggle = async (m: ProjectMilestone) => {
    const completed_at = m.completed_at ? null : new Date().toISOString();
    const { error } = await supabase.from("project_milestones" as any).update({ completed_at }).eq("id", m.id);
    if (error) toast.error(error.message); else fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete milestone?")) return;
    const { error } = await supabase.from("project_milestones" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else fetchAll();
  };

  const done = items.filter(i => i.completed_at).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <Card className="p-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{done} of {items.length} complete</span>
        <span className="text-sm font-semibold">{pct}%</span>
      </Card>

      <Card className="p-3 flex gap-2">
        <Input placeholder="Milestone title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1" />
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-[160px]" />
        <Button onClick={add} disabled={!title.trim()}><Plus className="w-4 h-4" /></Button>
      </Card>

      <div className="space-y-1.5">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No milestones yet.</p>
        ) : items.map(m => (
          <Card key={m.id} className="p-2 flex items-center gap-2">
            <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
            <Checkbox checked={!!m.completed_at} onCheckedChange={() => toggle(m)} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${m.completed_at ? "line-through text-muted-foreground" : ""}`}>{m.title}</p>
              {m.target_date && <p className="text-[10px] text-muted-foreground">Target {new Date(m.target_date).toLocaleDateString("en-IN")}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="w-3.5 h-3.5 text-red-600" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
