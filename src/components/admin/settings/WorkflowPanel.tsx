import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Workflow, Save } from "lucide-react";
import { toast } from "sonner";
import { STAGES } from "@/components/admin/constants";
import { invalidateAppSettings } from "@/hooks/useAppSettings";

interface S {
  id?: string;
  pipeline_stages_visible: string[];
  default_followup_days: number;
  auto_snapshot_on_send: boolean;
  auto_create_project_on_first_payment: boolean;
}

export default function WorkflowPanel() {
  const [s, setS] = useState<S>({
    pipeline_stages_visible: STAGES.map(x => x.key),
    default_followup_days: 3,
    auto_snapshot_on_send: true,
    auto_create_project_on_first_payment: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings" as any).select("*").limit(1).maybeSingle();
      if (data) {
        const d: any = data;
        setS({
          id: d.id,
          pipeline_stages_visible: Array.isArray(d.pipeline_stages_visible) && d.pipeline_stages_visible.length
            ? d.pipeline_stages_visible
            : STAGES.map(x => x.key),
          default_followup_days: d.default_followup_days ?? 3,
          auto_snapshot_on_send: d.auto_snapshot_on_send ?? true,
          auto_create_project_on_first_payment: d.auto_create_project_on_first_payment ?? false,
        });
      }
    })();
  }, []);

  const toggleStage = (key: string) => {
    setS(prev => ({
      ...prev,
      pipeline_stages_visible: prev.pipeline_stages_visible.includes(key)
        ? prev.pipeline_stages_visible.filter(k => k !== key)
        : [...prev.pipeline_stages_visible, key],
    }));
  };

  const save = async () => {
    setSaving(true);
    const payload: any = {
      pipeline_stages_visible: s.pipeline_stages_visible,
      default_followup_days: s.default_followup_days,
      auto_snapshot_on_send: s.auto_snapshot_on_send,
      auto_create_project_on_first_payment: s.auto_create_project_on_first_payment,
    };
    const { error } = s.id
      ? await supabase.from("app_settings" as any).update(payload).eq("id", s.id)
      : await supabase.from("app_settings" as any).insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { invalidateAppSettings(); toast.success("Workflow settings saved"); }
  };

  return (
    <Card className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Workflow className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Workflow & Automation</h3>
      </div>

      <div>
        <Label className="text-sm font-semibold">Visible Pipeline Stages</Label>
        <p className="text-xs text-muted-foreground mb-3">Hide stages your team doesn't use. Leads in hidden stages stay in the database.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STAGES.map(stage => (
            <label key={stage.key} className="flex items-center gap-2 p-2 rounded border border-border cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                checked={s.pipeline_stages_visible.includes(stage.key)}
                onChange={() => toggleStage(stage.key)}
              />
              <span className="text-sm">{stage.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>Default follow-up window (days)</Label>
        <Input
          type="number" min={1}
          value={s.default_followup_days}
          onChange={e => setS({ ...s, default_followup_days: Math.max(1, Number(e.target.value)) })}
          className="max-w-[120px]"
        />
        <p className="text-xs text-muted-foreground mt-1">Used to suggest the next follow-up date when none is set.</p>
      </div>

      <div className="flex items-center justify-between p-3 rounded border border-border">
        <div>
          <Label className="font-medium">Auto-snapshot on send</Label>
          <p className="text-xs text-muted-foreground">Automatically create a version snapshot when a quotation is sent.</p>
        </div>
        <Switch checked={s.auto_snapshot_on_send} onCheckedChange={v => setS({ ...s, auto_snapshot_on_send: v })} />
      </div>

      <div className="flex items-center justify-between p-3 rounded border border-border">
        <div>
          <Label className="font-medium">Auto-create project on first payment</Label>
          <p className="text-xs text-muted-foreground">When a payment is recorded against a lead with no project, create one automatically.</p>
        </div>
        <Switch checked={s.auto_create_project_on_first_payment} onCheckedChange={v => setS({ ...s, auto_create_project_on_first_payment: v })} />
      </div>

      <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1.5" />Save</Button>
    </Card>
  );
}
