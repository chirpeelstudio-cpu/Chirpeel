import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

interface Cat { id?: string; name: string; color: string; budget_monthly: number | null; is_active: boolean; sort_order: number; }

export default function ExpenseCategoriesPanel() {
  const [rows, setRows] = useState<Cat[]>([]);
  const [draft, setDraft] = useState<Cat>({ name: "", color: "#64748b", budget_monthly: null, is_active: true, sort_order: 0 });

  const load = async () => {
    const { data } = await supabase.from("expense_categories" as any).select("*").order("sort_order");
    setRows((data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.name.trim()) return toast.error("Name required");
    const { error } = await supabase.from("expense_categories" as any).insert({ ...draft, sort_order: rows.length + 1 });
    if (error) toast.error(error.message);
    else { setDraft({ name: "", color: "#64748b", budget_monthly: null, is_active: true, sort_order: 0 }); load(); toast.success("Added"); }
  };

  const update = async (id: string, patch: Partial<Cat>) => {
    const { error } = await supabase.from("expense_categories" as any).update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("expense_categories" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { load(); toast.success("Deleted"); }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Expense Categories</h3>
          <p className="text-xs text-muted-foreground">Used to classify business expenses with optional monthly budget alerts.</p>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded border border-border">
            <Input className="col-span-4" value={r.name} onChange={e => update(r.id!, { name: e.target.value })} />
            <input type="color" className="col-span-1 h-9 w-full rounded border border-input bg-background" value={r.color} onChange={e => update(r.id!, { color: e.target.value })} />
            <Input className="col-span-3" type="number" placeholder="Monthly budget (₹)" value={r.budget_monthly ?? ""} onChange={e => update(r.id!, { budget_monthly: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input className="col-span-1" type="number" value={r.sort_order} onChange={e => update(r.id!, { sort_order: Number(e.target.value) })} />
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={r.is_active} onCheckedChange={v => update(r.id!, { is_active: v })} />
              <span className="text-xs">{r.is_active ? "Active" : "Off"}</span>
            </div>
            <Button size="icon" variant="ghost" className="col-span-1" onClick={() => remove(r.id!)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-2 items-end pt-3 border-t border-border">
        <div className="col-span-4"><Label className="text-xs">Name</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Materials" /></div>
        <div className="col-span-1"><Label className="text-xs">Color</Label><input type="color" className="h-9 w-full rounded border border-input bg-background" value={draft.color} onChange={e => setDraft({ ...draft, color: e.target.value })} /></div>
        <div className="col-span-4"><Label className="text-xs">Monthly budget (₹)</Label><Input type="number" value={draft.budget_monthly ?? ""} onChange={e => setDraft({ ...draft, budget_monthly: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Optional" /></div>
        <Button className="col-span-3" onClick={add}><Plus className="w-4 h-4 mr-1.5" />Add category</Button>
      </div>
    </Card>
  );
}
