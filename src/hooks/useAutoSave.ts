import { useEffect, useRef, useState } from "react";

interface UseAutoSaveOptions<T> {
  /** The value to watch. Autosave fires when this changes (after debounce). */
  value: T;
  /** Async save fn. Should return when the save is complete. */
  onSave: () => Promise<unknown>;
  /** When false, autosave is paused entirely (e.g. quotation already sent). */
  enabled: boolean;
  /** Debounce after each change before saving (ms). Default 3000. */
  debounceMs?: number;
  /** Hard heartbeat — re-checks at this interval and saves if dirty (ms). Default 30000. */
  heartbeatMs?: number;
}

export type AutoSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function useAutoSave<T>({
  value,
  onSave,
  enabled,
  debounceMs = 3000,
  heartbeatMs = 30000,
}: UseAutoSaveOptions<T>) {
  const [state, setState] = useState<AutoSaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const debounceTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const initialValueRef = useRef<T>(value);
  const initialised = useRef(false);

  const flush = async () => {
    if (!enabled) return;
    if (savingRef.current) return;
    if (!dirtyRef.current) return;
    savingRef.current = true;
    setState("saving");
    try {
      await onSaveRef.current();
      dirtyRef.current = false;
      setLastSavedAt(new Date());
      setState("saved");
    } catch {
      setState("error");
    } finally {
      savingRef.current = false;
    }
  };

  // Mark dirty + debounce on value change (skip the very first run so we don't auto-save the initial mount)
  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true;
      initialValueRef.current = value;
      return;
    }
    if (!enabled) return;
    dirtyRef.current = true;
    setState((s) => (s === "saving" ? s : "dirty"));
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(flush, debounceMs);
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, debounceMs]);

  // Heartbeat: every N seconds, flush if still dirty
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(flush, heartbeatMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, heartbeatMs]);

  // Flush on tab hide (best-effort)
  useEffect(() => {
    if (!enabled) return;
    const onHide = () => { void flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { state, lastSavedAt, flush };
}
