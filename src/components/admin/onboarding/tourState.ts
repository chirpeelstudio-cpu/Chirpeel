import { useEffect, useState } from "react";

const STORAGE_KEY = "chirpeel.tour.completed.v2";
const REPLAY_EVENT = "chirpeel:welcome-tour:replay";

/** Trigger from anywhere to reopen the welcome tour. */
export function replayWelcomeTour() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(REPLAY_EVENT));
}

export function markTourComplete() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
}

/** Returns { open, setOpen, restart }. Auto-opens once for new users. */
export function useWelcomeTour(enabled: boolean) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // small delay so the layout has mounted before we try to anchor
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, [enabled]);

  useEffect(() => {
    const onReplay = () => setOpen(true);
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, []);

  return { open, setOpen };
}