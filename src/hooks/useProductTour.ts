import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const PENDING_KEY = "crm.tour.pending";

export function markTourPending() {
  try { localStorage.setItem(PENDING_KEY, "1"); } catch { /* ignore */ }
}

/**
 * Manages product-tour state: whether to auto-open and how to mark it complete.
 */
export function useProductTour() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pending = (() => { try { return localStorage.getItem(PENDING_KEY) === "1"; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (!cancelled) setChecked(true); return; }

      const { data } = await supabase
        .from("profiles")
        .select("tour_completed_at")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      const completed = !!data?.tour_completed_at;
      if (pending || !completed) {
        // Small delay so the dashboard renders before we open the spotlight.
        setTimeout(() => { if (!cancelled) setOpen(true); }, 600);
      }
      setChecked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const start = useCallback(() => setOpen(true), []);

  const close = useCallback(async (markComplete: boolean) => {
    setOpen(false);
    try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    if (markComplete) {
      try { await supabase.rpc("mark_tour_completed" as never); } catch { /* non-fatal */ }
    }
  }, []);

  return { open, checked, start, close };
}