import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ListChecks, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Tpl { id: string; name: string; description: string | null; is_default: boolean; }
interface Item { id?: string; template_id: string; label: string; percentage: number; due_offset_days: number; sort_order: number; }

export default function MilestoneTemplatesPanel() {
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState({ name: "", description: "" });

  const load = async () => {
    const { data: t } = await supabase.from("payment_milestone_templates" as any).select("*").order("created_at");
    const list = (t ?? []) as any as Tpl[];
    setTpls(list);
    if (list.length) {
      const { data: it } = await supabase.from("payment_milestone_template_items" as any).select("*").in("template_id", list.map(x => x.id)).order("sort_order");
      const grouped: Record<string, Item[]> = {};
      ((it ?? []) as any as Item[]).forEach(i => { (grouped[i.template_id] ??= []).push(i); });
      setItems(grouped);
    }
  };
  useEffect(() => { load(); }, []);

  const addTpl = async () => {
    if (!draft.name.trim()) return toast.error("Name required");
    const { error } = await supabase.from("payment_milestone_templates" as any).insert(draft);
    if (error) toast.error(error.message); else { setDraft({ name: "", description: "" }); load(); toast.success("Template added"); }
  };

  const updateTpl = async (id: string, patch: Partial<Tpl>) => {
    const { error } = await supabase.from("payment_milestone_templates" as any).update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const removeTpl = async (id: string) => {
    if (!confirm("Delete template and its line items?")) return;
    const { error } = await supabase.from("payment_milestone_templates" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { load(); toast.success("Deleted"); }
  };

  const addItem = async (template_id: string) => {
    const sort_order = (items[template_id]?.length ?? 0) + 1;
    const { error } = await supabase.from("payment_milestone_template_items" as any).insert({ template_id, label: "Milestone", percentage: 0, due_offset_days: 0, sort_order });
    if (error) toast.error(error.message); else load();
  };
  const updateItem = async (id: string, patch: Partial<Item>) => {
    const { error } = await supabase.from("payment_milestone_template_items" as any).update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const removeItem = async (id: string) => {
    const { error } = await supabase.from("payment_milestone_template_items" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Payment Milestone Templates</h3>
          <p className="text-xs text-muted-foreground">Reusable payment schedules (e.g. 40/40/20). Percentages should sum to 100.</p>
        </div>
      </div>

      <div className="space-y-3">
        {tpls.map(t => {
          const list = items[t.id] ?? [];
          const sum = list.reduce((a, b) => a + Number(b.percentage || 0), 0);
          const isOpen = open[t.id] ?? true;
          return (
            <div key={t.id} className="rounded border border-border">
              <div className="grid grid-cols-12 gap-2 items-center p-3">
                <Button size="icon" variant="ghost" className="col-span-1" onClick={() => setOpen({ ...open, [t.id]: !isOpen })}>
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
                <Input className="col-span-4" value={t.name} onChange={e => updateTpl(t.id, { name: e.target.value })} />
                <Input className="col-span-4" placeholder="Description" value={t.description ?? ""} onChange={e => updateTpl(t.id, { description: e.target.value })} />
                <div className="col-span-2 flex items-center gap-2">
                  <Switch checked={t.is_default} onCheckedChange={v => updateTpl(t.id, { is_default: v })} />
                  <span className="text-xs">Default</span>
                </div>
                <Button size="icon" variant="ghost" className="col-span-1" onClick={() => removeTpl(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>

              {isOpen && (
                <div className="border-t border-border p-3 space-y-2 bg-muted/30">
                  {list.map(i => (
                    <div key={i.id} className="grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-5" value={i.label} onChange={e => updateItem(i.id!, { label: e.target.value })} />
                      <div className="col-span-2"><Input type="number" step="0.01" value={i.percentage} onChange={e => updateItem(i.id!, { percentage: Number(e.target.value) })} placeholder="%" /></div>
                      <div className="col-span-3"><Input type="number" value={i.due_offset_days} onChange={e => updateItem(i.id!, { due_offset_days: Number(e.target.value) })} placeholder="Due offset (days)" /></div>
                      <Input className="col-span-1" type="number" value={i.sort_order} onChange={e => updateItem(i.id!, { sort_order: Number(e.target.value) })} />
                      <Button size="icon" variant="ghost" className="col-span-1" onClick={() => removeItem(i.id!)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2">
                    <span className={`text-xs ${sum === 100 ? "text-emerald-600" : "text-amber-600"}`}>Sum: {sum}% {sum !== 100 && "(should be 100)"}</span>
                    <Button size="sm" variant="outline" onClick={() => addItem(t.id)}><Plus className="w-3 h-3 mr-1" />Add milestone</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-2 items-end pt-3 border-t border-border">
        <div className="col-span-4"><Label className="text-xs">Template name</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="50/30/20 plan" /></div>
        <div className="col-span-5"><Label className="text-xs">Description</Label><Input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
        <Button className="col-span-3" onClick={addTpl}><Plus className="w-4 h-4 mr-1.5" />Add template</Button>
      </div>
    </Card>
  );
}
