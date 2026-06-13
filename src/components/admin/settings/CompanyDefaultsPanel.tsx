import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  id?: string;
  default_gst_rate: number;
  default_validity_days: number;
  default_terms: string | null;
  profit_margin_alert_pct: number;
  monthly_lead_target: number;
  monthly_revenue_target: number;
  overdue_threshold_days: number;
}

export default function CompanyDefaultsPanel() {
  const [s, setS] = useState<Settings>({
    default_gst_rate: 18, default_validity_days: 15, default_terms: "",
    profit_margin_alert_pct: 25, monthly_lead_target: 50, monthly_revenue_target: 1000000,
    overdue_threshold_days: 1,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings" as any).select("*").limit(1).maybeSingle();
      if (data) setS(data as unknown as Settings);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload: any = {
      default_gst_rate: s.default_gst_rate,
      default_validity_days: s.default_validity_days,
      default_terms: s.default_terms,
      profit_margin_alert_pct: s.profit_margin_alert_pct,
      monthly_lead_target: s.monthly_lead_target,
      monthly_revenue_target: s.monthly_revenue_target,
      overdue_threshold_days: s.overdue_threshold_days,
    };
    const { error } = s.id
      ? await supabase.from("app_settings" as any).update(payload).eq("id", s.id)
      : await supabase.from("app_settings" as any).insert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  };

  return (
    <Card className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <SettingsIcon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Company Defaults</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Default GST Rate (%)</Label>
          <Input type="number" value={s.default_gst_rate} onChange={(e) => setS({ ...s, default_gst_rate: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Default Validity (days)</Label>
          <Input type="number" value={s.default_validity_days} onChange={(e) => setS({ ...s, default_validity_days: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Profit-margin alert below (%)</Label>
          <Input type="number" value={s.profit_margin_alert_pct} onChange={(e) => setS({ ...s, profit_margin_alert_pct: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Monthly lead target</Label>
          <Input type="number" value={s.monthly_lead_target} onChange={(e) => setS({ ...s, monthly_lead_target: Number(e.target.value) })} />
        </div>
        <div className="col-span-2">
          <Label>Monthly revenue target (₹)</Label>
          <Input type="number" value={s.monthly_revenue_target} onChange={(e) => setS({ ...s, monthly_revenue_target: Number(e.target.value) })} />
        </div>
        <div className="col-span-2">
          <Label>Overdue follow-up threshold (days past due)</Label>
          <Input
            type="number"
            min={0}
            value={s.overdue_threshold_days}
            onChange={(e) => setS({ ...s, overdue_threshold_days: Math.max(0, Number(e.target.value)) })}
          />
          <p className="text-xs text-muted-foreground mt-1">A follow-up is flagged "Overdue" once it is this many days past its due date. 0 = the moment it's due. Common: 1, 3, or 7.</p>
        </div>
        <div className="col-span-2">
          <Label>Default Terms & Conditions</Label>
          <Textarea rows={6} value={s.default_terms || ""} onChange={(e) => setS({ ...s, default_terms: e.target.value })} />
        </div>
      </div>

      <Button className="mt-4" onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1.5" />Save</Button>
    </Card>
  );
}
