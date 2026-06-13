import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ArrowUp, ArrowDown, Layers } from "lucide-react";
import { toast } from "sonner";

interface Stage {
  id: string;
  key: string;
  label: string;
  color: string;
  sub_statuses: string[];
  active: boolean;
  sort_order: number;
}

const COLORS = [
  "bg-blue-500","bg-yellow-500","bg-orange-500","bg-pink-500","bg-purple-500",
  "bg-indigo-500","bg-teal-500","bg-green-500","bg-red-500","bg-gray-500"
];

export default function PipelineStagesPanel() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [draft, setDraft] = useState({ key: "", label: "", color: "bg-blue-500" });

  const load = async () => {
    const { data } = await supabase.from("pipeline_stages" as any).select("*").order("sort_order");
    setStages(((data ?? []) as any[]).map(s => ({ ...s, sub_statuses: Array.isArray(s.sub_statuses) ? s.sub_statuses : [] })));
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Stage>) => {
    const { error } = await supabase.from("pipeline_stages" as any).update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= stages.length) return;
    const a = stages[idx], b = stages[target];
    await Promise.all([
      supabase.from("pipeline_stages" as any).update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("pipeline_stages" as any).update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    load();
  };

  const add = async () => {
    if (!draft.key.trim() || !draft.label.trim()) return toast.error("Key and label required");
    const { error } = await supabase.from("pipeline_stages" as any).insert({
      key: draft.key, label: draft.label, color: draft.color,
      sort_order: stages.length + 1, sub_statuses: [],
    });
    if (error) toast.error(error.message);
    else { setDraft({ key: "", label: "", color: "bg-blue-500" }); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete stage? Leads assigned to it will keep the stage value but no column will show.")) return;
    const { error } = await supabase.from("pipeline_stages" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const updateSubs = (id: string, raw: string) => {
    const list = raw.split(",").map(s => s.trim()).filter(Boolean);
    update(id, { sub_statuses: list });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Pipeline Stages</h3>
      </div>
      <p className="text-xs text-muted-foreground">Rename, reorder, recolor your Kanban columns and edit each stage's sub-statuses (comma-separated).</p>

      <div className="space-y-2">
        {stages.map((s, idx) => (
          <div key={s.id} className="p-3 rounded border border-border space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <Input className="flex-1" value={s.label} onChange={e => update(s.id, { label: e.target.value })} />
              <select className="h-9 rounded border border-input bg-background px-2 text-sm" value={s.color} onChange={e => update(s.id, { color: e.target.value })}>
                {COLORS.map(c => <option key={c} value={c}>{c.replace("bg-","").replace("-500","")}</option>)}
              </select>
              <Switch checked={s.active} onCheckedChange={v => update(s.id, { active: v })} />
              <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}><ArrowUp className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === stages.length - 1}><ArrowDown className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sub-statuses (comma-separated)</Label>
              <Input
                defaultValue={s.sub_statuses.join(", ")}
                onBlur={e => updateSubs(s.id, e.target.value)}
                placeholder="e.g. Pending, In Progress, Done"
              />
            </div>
            <div className="text-xs text-muted-foreground">key: <code>{s.key}</code></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-2 items-end pt-3 border-t border-border">
        <div className="col-span-3"><Label className="text-xs">Key</Label><Input value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value })} placeholder="unique_key" /></div>
        <div className="col-span-5"><Label className="text-xs">Label</Label><Input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} placeholder="Stage name" /></div>
        <div className="col-span-2"><Label className="text-xs">Color</Label>
          <select className="h-9 w-full rounded border border-input bg-background px-2 text-sm" value={draft.color} onChange={e => setDraft({ ...draft, color: e.target.value })}>
            {COLORS.map(c => <option key={c} value={c}>{c.replace("bg-","").replace("-500","")}</option>)}
          </select>
        </div>
        <Button className="col-span-2" onClick={add}><Plus className="w-4 h-4 mr-1.5" />Add</Button>
      </div>
    </Card>
  );
}
