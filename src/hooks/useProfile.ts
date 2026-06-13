import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProfileState = {
  id: string | null;
  email: string;
  fullName: string;
  avatarUrl: string | null;
};

const EMPTY: ProfileState = { id: null, email: "", fullName: "", avatarUrl: null };
const EVENT = "profile:updated";

let cache: ProfileState = EMPTY;
let inflight: Promise<ProfileState> | null = null;

async function fetchProfile(): Promise<ProfileState> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    cache = EMPTY;
    return cache;
  }
  const uid = session.user.id;
  const { data } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, email")
    .eq("id", uid)
    .maybeSingle();
  cache = {
    id: uid,
    email: data?.email ?? session.user.email ?? "",
    fullName: data?.full_name ?? "",
    avatarUrl: data?.avatar_url ?? null,
  };
  return cache;
}

/** Broadcast a profile change. Pass a partial to merge into cache, or omit to refetch. */
export async function refreshProfile(patch?: Partial<ProfileState>) {
  if (patch) {
    cache = { ...cache, ...patch };
    window.dispatchEvent(new CustomEvent<ProfileState>(EVENT, { detail: cache }));
  }
  inflight = fetchProfile();
  const next = await inflight;
  inflight = null;
  window.dispatchEvent(new CustomEvent<ProfileState>(EVENT, { detail: next }));
  return next;
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileState>(cache);
  const [loading, setLoading] = useState(cache.id === null);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await (inflight ?? fetchProfile());
    setProfile(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (cache.id === null) load();
    else setLoading(false);

    const onUpdate = (e: Event) => setProfile((e as CustomEvent<ProfileState>).detail);
    window.addEventListener(EVENT, onUpdate);

    const { data: sub } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => {
      window.removeEventListener(EVENT, onUpdate);
      sub.subscription.unsubscribe();
    };
  }, [load]);

  return { profile, loading, refresh: () => refreshProfile() };
}