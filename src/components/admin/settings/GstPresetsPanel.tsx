import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";

interface Preset { id?: string; label: string; rate: number; hsn_sac_code: string | null; is_default: boolean; sort_order: number; }

export default function GstPresetsPanel() {
  const [rows, setRows] = useState<Preset[]>([]);
  const [draft, setDraft] = useState<Preset>({ label: "", rate: 18, hsn_sac_code: "", is_default: false, sort_order: 0 });

  const load = async () => {
    const { data } = await supabase.from("gst_presets" as any).select("*").order("sort_order");
    setRows((data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.label.trim()) return toast.error("Label is required");
    const { error } = await supabase.from("gst_presets" as any).insert({ ...draft, sort_order: rows.length + 1 });
    if (error) toast.error(error.message);
    else { setDraft({ label: "", rate: 18, hsn_sac_code: "", is_default: false, sort_order: 0 }); load(); toast.success("Added"); }
  };

  const update = async (id: string, patch: Partial<Preset>) => {
    const { error } = await supabase.from("gst_presets" as any).update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this preset?")) return;
    const { error } = await supabase.from("gst_presets" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { load(); toast.success("Deleted"); }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Receipt className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">GST Presets</h3>
          <p className="text-xs text-muted-foreground">Reusable tax rates available in quotes & invoices.</p>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded border border-border">
            <Input className="col-span-4" value={r.label} onChange={e => update(r.id!, { label: e.target.value })} />
            <Input className="col-span-2" type="number" step="0.01" value={r.rate} onChange={e => update(r.id!, { rate: Number(e.target.value) })} />
            <Input className="col-span-3" placeholder="HSN/SAC" value={r.hsn_sac_code ?? ""} onChange={e => update(r.id!, { hsn_sac_code: e.target.value })} />
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={r.is_default} onCheckedChange={v => update(r.id!, { is_default: v })} />
              <span className="text-xs">Default</span>
            </div>
            <Button size="icon" variant="ghost" className="col-span-1" onClick={() => remove(r.id!)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-2 items-end pt-3 border-t border-border">
        <div className="col-span-4"><Label className="text-xs">Label</Label><Input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} placeholder="GST 18% (Standard)" /></div>
        <div className="col-span-2"><Label className="text-xs">Rate %</Label><Input type="number" step="0.01" value={draft.rate} onChange={e => setDraft({ ...draft, rate: Number(e.target.value) })} /></div>
        <div className="col-span-3"><Label className="text-xs">HSN/SAC</Label><Input value={draft.hsn_sac_code ?? ""} onChange={e => setDraft({ ...draft, hsn_sac_code: e.target.value })} placeholder="9954" /></div>
        <Button className="col-span-3" onClick={add}><Plus className="w-4 h-4 mr-1.5" />Add preset</Button>
      </div>
    </Card>
  );
}
