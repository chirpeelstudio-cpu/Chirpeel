import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Percent, Save } from "lucide-react";
import { toast } from "sonner";

export default function DiscountCapsPanel() {
  const [row, setRow] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("app_settings").select("*").limit(1).maybeSingle();
    setRow(data);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!row?.id) return;
    setSaving(true);
    const { error } = await supabase.from("app_settings").update({
      discount_cap_executive_pct: row.discount_cap_executive_pct,
      discount_cap_manager_pct: row.discount_cap_manager_pct,
      discount_cap_admin_pct: row.discount_cap_admin_pct,
    } as any).eq("id", row.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Discount caps saved");
  };

  if (!row) return <Card className="p-6">Loading…</Card>;

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Percent className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Discount Approval Caps</h3>
          <p className="text-xs text-muted-foreground">Maximum discount % each role can apply on quotes without escalation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Executive cap (%)</Label>
          <Input type="number" min={0} max={100} value={row.discount_cap_executive_pct ?? 0}
            onChange={e => setRow({ ...row, discount_cap_executive_pct: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Manager cap (%)</Label>
          <Input type="number" min={0} max={100} value={row.discount_cap_manager_pct ?? 0}
            onChange={e => setRow({ ...row, discount_cap_manager_pct: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Admin cap (%)</Label>
          <Input type="number" min={0} max={100} value={row.discount_cap_admin_pct ?? 0}
            onChange={e => setRow({ ...row, discount_cap_admin_pct: Number(e.target.value) })} />
        </div>
      </div>

      <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1.5" />{saving ? "Saving…" : "Save caps"}</Button>
    </Card>
  );
}
