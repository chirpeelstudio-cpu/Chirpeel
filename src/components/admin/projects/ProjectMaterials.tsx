import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ProjectMaterial } from "./types";

export function ProjectMaterials({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ProjectMaterial[]>([]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("nos");
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase.from("project_materials" as any)
      .select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as ProjectMaterial[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  const add = async () => {
    if (!name.trim() || !qty) return;
    const { error } = await supabase.from("project_materials" as any).insert({
      project_id: projectId, item_name: name.trim(), qty_required: Number(qty), unit, qty_received: 0,
    });
    if (error) toast.error(error.message); else { setName(""); setQty(""); fetchAll(); }
  };

  const updateReceived = async (id: string, qty_received: number) => {
    const { error } = await supabase.from("project_materials" as any).update({ qty_received }).eq("id", id);
    if (error) toast.error(error.message); else fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete material?")) return;
    const { error } = await supabase.from("project_materials" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else fetchAll();
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 grid grid-cols-[1fr_100px_100px_auto] gap-2">
        <Input placeholder="Item name" value={name} onChange={e => setName(e.target.value)} />
        <Input type="number" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)} />
        <Input placeholder="Unit" value={unit} onChange={e => setUnit(e.target.value)} />
        <Button onClick={add} disabled={!name.trim() || !qty}><Plus className="w-4 h-4" /></Button>
      </Card>

      {loading ? <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        : items.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No materials yet.</p>
        : (
          <div className="space-y-1.5">
            {items.map(m => {
              const req = Number(m.qty_required);
              const recv = Number(m.qty_received);
              const pct = req > 0 ? Math.min(100, (recv / req) * 100) : 0;
              return (
                <Card key={m.id} className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.item_name}</p>
                      <p className="text-[11px] text-muted-foreground">{recv} of {req} {m.unit}</p>
                    </div>
                    <Input
                      type="number"
                      className="w-[80px] h-8"
                      value={recv}
                      onChange={e => updateReceived(m.id, Number(e.target.value))}
                    />
                    <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="w-3.5 h-3.5 text-red-600" /></Button>
                  </div>
                  <Progress value={pct} className="h-1.5 mt-2" />
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}
