import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Copy } from "lucide-react";
import { toast } from "sonner";

interface S { id?: string; dedup_warn_enabled: boolean; dedup_auto_merge: boolean; }

export default function DeduplicationPanel() {
  const [s, setS] = useState<S>({ dedup_warn_enabled: true, dedup_auto_merge: false });
  const [stats, setStats] = useState<{ phoneDupes: number; emailDupes: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings" as any).select("id, dedup_warn_enabled, dedup_auto_merge").limit(1).maybeSingle();
      if (data) setS(data as any);

      const { data: leads } = await supabase.from("leads").select("phone, email").is("deleted_at", null);
      if (leads) {
        const phones = new Map<string, number>();
        const emails = new Map<string, number>();
        leads.forEach(l => {
          if (l.phone) phones.set(l.phone, (phones.get(l.phone) ?? 0) + 1);
          if (l.email) emails.set(l.email, (emails.get(l.email) ?? 0) + 1);
        });
        setStats({
          phoneDupes: Array.from(phones.values()).filter(n => n > 1).length,
          emailDupes: Array.from(emails.values()).filter(n => n > 1).length,
        });
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = { dedup_warn_enabled: s.dedup_warn_enabled, dedup_auto_merge: s.dedup_auto_merge };
    const { error } = s.id
      ? await supabase.from("app_settings" as any).update(payload).eq("id", s.id)
      : await supabase.from("app_settings" as any).insert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  return (
    <Card className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <Copy className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Lead Deduplication</h3>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded border border-border">
            <div className="text-xs text-muted-foreground">Duplicate phones</div>
            <div className="text-2xl font-bold">{stats.phoneDupes}</div>
          </div>
          <div className="p-3 rounded border border-border">
            <div className="text-xs text-muted-foreground">Duplicate emails</div>
            <div className="text-2xl font-bold">{stats.emailDupes}</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-3 rounded border border-border">
        <div>
          <Label className="font-medium">Warn on duplicate phone/email</Label>
          <p className="text-xs text-muted-foreground">Show a warning when adding a lead with a phone/email that already exists.</p>
        </div>
        <Switch checked={s.dedup_warn_enabled} onCheckedChange={v => setS({ ...s, dedup_warn_enabled: v })} />
      </div>

      <div className="flex items-center justify-between p-3 rounded border border-border">
        <div>
          <Label className="font-medium">Auto-merge exact matches</Label>
          <p className="text-xs text-muted-foreground">When the new lead's phone exactly matches an existing one, append details to the existing lead instead of creating a new row.</p>
        </div>
        <Switch checked={s.dedup_auto_merge} onCheckedChange={v => setS({ ...s, dedup_auto_merge: v })} />
      </div>

      <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1.5" />Save</Button>

      <p className="text-xs text-muted-foreground italic">Note: enforcement of these toggles in the lead-creation flow lands as part of Phase 4 (automation engine).</p>
    </Card>
  );
}
