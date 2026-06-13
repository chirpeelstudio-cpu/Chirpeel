import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Save } from "lucide-react";
import { toast } from "sonner";
import { invalidateAppSettings } from "@/hooks/useAppSettings";

const SOUND_KEY = "admin.newLeadSound";

export default function NotificationsPanel() {
  const [digestOptIn, setDigestOptIn] = useState(true);
  const [sound, setSound] = useState(true);
  const [appId, setAppId] = useState<string | undefined>();
  const [digestHour, setDigestHour] = useState(9);
  const [reminderDays, setReminderDays] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("digest_opt_in").eq("id", session.user.id).maybeSingle();
        if (data) setDigestOptIn(data.digest_opt_in ?? true);
      }
      const { data: app } = await supabase.from("app_settings" as any).select("id, digest_send_hour, reminder_cadence_days").limit(1).maybeSingle();
      if (app) {
        const a: any = app;
        setAppId(a.id);
        setDigestHour(a.digest_send_hour ?? 9);
        setReminderDays(a.reminder_cadence_days ?? 3);
      }
      const stored = localStorage.getItem(SOUND_KEY);
      if (stored !== null) setSound(stored === "true");
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("profiles").update({ digest_opt_in: digestOptIn }).eq("id", session.user.id);
    }
    const payload: any = { digest_send_hour: digestHour, reminder_cadence_days: reminderDays };
    const { error } = appId
      ? await supabase.from("app_settings" as any).update(payload).eq("id", appId)
      : await supabase.from("app_settings" as any).insert(payload);
    localStorage.setItem(SOUND_KEY, String(sound));
    setSaving(false);
    if (error) toast.error(error.message);
    else { invalidateAppSettings(); toast.success("Notification preferences saved"); }
  };

  return (
    <Card className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Notifications</h3>
      </div>

      <div className="flex items-center justify-between p-3 rounded border border-border">
        <div>
          <Label className="font-medium">Daily digest email</Label>
          <p className="text-xs text-muted-foreground">Receive a morning summary of leads, follow-ups & payments.</p>
        </div>
        <Switch checked={digestOptIn} onCheckedChange={setDigestOptIn} />
      </div>

      <div className="flex items-center justify-between p-3 rounded border border-border">
        <div>
          <Label className="font-medium">New-lead sound alert</Label>
          <p className="text-xs text-muted-foreground">Play a chime in this browser when a new lead arrives.</p>
        </div>
        <Switch checked={sound} onCheckedChange={setSound} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Digest send hour (0-23)</Label>
          <Input type="number" min={0} max={23} value={digestHour} onChange={e => setDigestHour(Math.max(0, Math.min(23, Number(e.target.value))))} />
        </div>
        <div>
          <Label>Payment reminder cadence (days)</Label>
          <Input type="number" min={1} value={reminderDays} onChange={e => setReminderDays(Math.max(1, Number(e.target.value)))} />
        </div>
      </div>

      <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1.5" />Save</Button>
    </Card>
  );
}
