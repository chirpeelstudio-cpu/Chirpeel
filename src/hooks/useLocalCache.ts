import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight localStorage cache for list data.
 * - Hydrates synchronously from cache on first render (instant render on slow networks).
 * - Exposes `setAndCache` to update both state and storage in one call.
 * - Silently ignores quota / serialization errors.
 */

const PREFIX = "chirpeel.cache.v1.";

type Envelope<T> = { v: 1; t: number; data: T };

export function readCache<T>(key: string): { data: T; updatedAt: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (!parsed || parsed.v !== 1) return null;
    return { data: parsed.data, updatedAt: parsed.t };
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T) {
  try {
    const env: Envelope<T> = { v: 1, t: Date.now(), data };
    localStorage.setItem(PREFIX + key, JSON.stringify(env));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearCache(key: string) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}

export function useLocalCache<T>(key: string, initial: T) {
  const cached = useRef(readCache<T>(key));
  const [value, setValue] = useState<T>(cached.current?.data ?? initial);
  const [hydratedFromCache] = useState<boolean>(!!cached.current);

  const setAndCache = useCallback((next: T | ((prev: T) => T)) => {
    setValue(prev => {
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      writeCache(key, v);
      return v;
    });
  }, [key]);

  // Keep cache in sync when value changes via setValue directly (defensive)
  useEffect(() => {
    // no-op; setAndCache is the canonical writer
  }, [value]);

  return { value, setValue: setAndCache, hydratedFromCache };
}
