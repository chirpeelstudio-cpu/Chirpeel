import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Clock, Save } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkingHoursCard() {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("19:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [tz, setTz] = useState("Asia/Kolkata");
  const [digestOptIn, setDigestOptIn] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("working_hours, tz, digest_opt_in").eq("id", user.id).maybeSingle();
      if (data?.working_hours) {
        const wh = data.working_hours as any;
        if (wh.start) setStart(wh.start);
        if (wh.end) setEnd(wh.end);
        if (wh.days) setDays(wh.days);
      }
      if (data?.tz) setTz(data.tz);
      if (typeof data?.digest_opt_in === "boolean") setDigestOptIn(data.digest_opt_in);
    })();
  }, []);

  const toggleDay = (d: number) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update({
      working_hours: { start, end, days } as any,
      tz,
      digest_opt_in: digestOptIn,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Preferences saved");
  };

  return (
    <Card className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Working Hours & Notifications</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Reminders and notifications are silenced outside your working hours.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start</Label>
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <Label>End</Label>
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <Label className="mb-2 block">Working days</Label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((d, i) => {
            const dayNum = i + 1;
            const active = days.includes(dayNum);
            return (
              <button key={d} type="button" onClick={() => toggleDay(dayNum)}
                className={`px-3 py-1.5 rounded text-xs font-medium border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <Label>Timezone</Label>
        <Input value={tz} onChange={(e) => setTz(e.target.value)} placeholder="Asia/Kolkata" />
      </div>

      <div className="mt-4 flex items-center justify-between p-3 rounded bg-muted/40">
        <div>
          <p className="text-sm font-medium">Daily digest email</p>
          <p className="text-xs text-muted-foreground">9 AM summary of leads, follow-ups, and collections</p>
        </div>
        <Switch checked={digestOptIn} onCheckedChange={setDigestOptIn} />
      </div>

      <Button className="mt-4" onClick={save} disabled={saving}>
        <Save className="w-4 h-4 mr-1.5" />Save
      </Button>
    </Card>
  );
}
