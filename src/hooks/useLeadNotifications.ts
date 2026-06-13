import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMyWorkingHours, isWithinWorkingHours } from "./useWorkingHours";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export function useLeadNotifications(onNewLead: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { workingHours, loaded } = useMyWorkingHours();

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.6;

    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const lead = payload.new as { name?: string; phone?: string; source?: string };
          // Always refresh data; only suppress sound/toast outside working hours
          onNewLead();
          if (loaded && !isWithinWorkingHours(new Date(), workingHours)) return;
          audioRef.current?.play().catch(() => {});
          toast.success(`🔔 New Lead: ${lead.name || "Unknown"}`, {
            description: `Phone: ${lead.phone || "N/A"} • Source: ${lead.source?.replace("_", " ") || "website"}`,
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [onNewLead, workingHours, loaded]);
}

