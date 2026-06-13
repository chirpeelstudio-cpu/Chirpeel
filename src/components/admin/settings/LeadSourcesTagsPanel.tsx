import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

interface Row { id?: string; key: string; label: string; color: string; active: boolean; sort_order: number; }

const COLORS = ["gray","blue","green","amber","red","purple","pink","cyan","emerald","indigo","orange"];

function CrudList({ table, title }: { table: "lead_sources" | "lead_tags"; title: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Row>({ key: "", label: "", color: "gray", active: true, sort_order: 0 });

  const load = async () => {
    const { data } = await supabase.from(table as any).select("*").order("sort_order");
    setRows((data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.key.trim() || !draft.label.trim()) return toast.error("Key and label required");
    const { error } = await supabase.from(table as any).insert({ ...draft, sort_order: rows.length + 1 });
    if (error) toast.error(error.message);
    else { setDraft({ key: "", label: "", color: "gray", active: true, sort_order: 0 }); load(); toast.success("Added"); }
  };

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from(table as any).update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { load(); toast.success("Deleted"); }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Tag className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded border border-border">
            <Input className="col-span-3" value={r.key} onChange={e => update(r.id!, { key: e.target.value })} />
            <Input className="col-span-4" value={r.label} onChange={e => update(r.id!, { label: e.target.value })} />
            <select className="col-span-2 h-9 rounded border border-input bg-background px-2 text-sm" value={r.color} onChange={e => update(r.id!, { color: e.target.value })}>
              {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={r.active} onCheckedChange={v => update(r.id!, { active: v })} />
              <span className="text-xs">{r.active ? "Active" : "Off"}</span>
            </div>
            <Button size="icon" variant="ghost" className="col-span-1" onClick={() => remove(r.id!)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-2 items-end pt-3 border-t border-border">
        <div className="col-span-3"><Label className="text-xs">Key</Label><Input value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value })} placeholder="unique_key" /></div>
        <div className="col-span-4"><Label className="text-xs">Label</Label><Input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} placeholder="Display label" /></div>
        <div className="col-span-2"><Label className="text-xs">Color</Label>
          <select className="h-9 w-full rounded border border-input bg-background px-2 text-sm" value={draft.color} onChange={e => setDraft({ ...draft, color: e.target.value })}>
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button className="col-span-3" onClick={add}><Plus className="w-4 h-4 mr-1.5" />Add</Button>
      </div>
    </Card>
  );
}

export default function LeadSourcesTagsPanel() {
  return (
    <div className="space-y-6">
      <CrudList table="lead_sources" title="Lead Sources" />
      <CrudList table="lead_tags" title="Lead Tags" />
    </div>
  );
}
