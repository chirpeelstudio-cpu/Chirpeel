import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WorkingHours {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
  days: number[]; // 1=Mon..7=Sun
}

const DEFAULT: WorkingHours = { start: "09:00", end: "19:00", days: [1, 2, 3, 4, 5, 6] };

export function isWithinWorkingHours(now: Date, wh: WorkingHours = DEFAULT): boolean {
  const day = ((now.getDay() + 6) % 7) + 1; // JS: 0=Sun..6=Sat -> 1=Mon..7=Sun
  if (!wh.days?.includes(day)) return false;
  const [sh, sm] = wh.start.split(":").map(Number);
  const [eh, em] = wh.end.split(":").map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= sh * 60 + sm && minutes <= eh * 60 + em;
}

export function useMyWorkingHours() {
  const [wh, setWh] = useState<WorkingHours>(DEFAULT);
  const [tz, setTz] = useState("Asia/Kolkata");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }
      const { data } = await supabase.from("profiles").select("working_hours, tz").eq("id", user.id).maybeSingle();
      if (data) {
        if (data.working_hours) setWh(data.working_hours as unknown as WorkingHours);
        if (data.tz) setTz(data.tz);
      }
      setLoaded(true);
    })();
  }, []);

  return { workingHours: wh, tz, loaded };
}
