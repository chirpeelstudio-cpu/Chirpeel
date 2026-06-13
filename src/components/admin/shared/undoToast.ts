import { toast } from "sonner";

interface UndoToastOptions {
  /** Main toast title, e.g. `Lead "Acme" moved to trash` */
  title: string;
  /** Seconds the Undo action stays available (default 6) */
  seconds?: number;
  /** Called when the user taps Undo before the countdown ends */
  onUndo: () => void | Promise<void>;
}

/**
 * Shows a sonner toast with an "Undo available for Ns" live countdown
 * and an Undo action. Auto-dismisses when the countdown hits zero.
 *
 * The toast uses aria-live (configured globally in sonner.tsx) so screen
 * readers announce the title once; the countdown updates silently.
 */
export function showUndoToast({ title, seconds = 6, onUndo }: UndoToastOptions) {
  const total = seconds;
  let remaining = total;

  const id = toast.success(title, {
    description: `Undo available for ${remaining}s`,
    action: { label: "Undo", onClick: () => { clearInterval(interval); onUndo(); } },
    duration: total * 1000,
  });

  const interval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(interval);
      return;
    }
    // Update the same toast in place — no re-announcement to screen readers.
    toast.success(title, {
      id,
      description: `Undo available for ${remaining}s`,
      action: { label: "Undo", onClick: () => { clearInterval(interval); onUndo(); } },
      duration: remaining * 1000,
    });
  }, 1000);

  return id;
}
