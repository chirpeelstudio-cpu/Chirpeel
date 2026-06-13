import { supabase } from "@/integrations/supabase/client";

export type GuardResult =
  | { ok: true; userId: string; email: string | null }
  | { ok: false; reason: "no-session" | "not-admin" | "error"; message?: string };

let cachedAdminCheck: { userId: string; isAdmin: boolean; at: number } | null = null;
const ADMIN_CACHE_TTL = 60_000; // 1 minute

/**
 * Centralized session check. Call this BEFORE any Supabase query in admin
 * components so we never fire requests as a guest (which would either fail
 * silently due to RLS or leak attempted-fetch noise to the network tab).
 *
 * @param opts.requireAdmin When true, also verifies the user has the `admin`
 * role in `user_roles`. Result is cached for 60s per user id.
 */
export async function ensureAuthed(opts: { requireAdmin?: boolean } = {}): Promise<GuardResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { ok: false, reason: "no-session" };

    if (opts.requireAdmin) {
      const cached = cachedAdminCheck;
      const fresh = cached && cached.userId === session.user.id && Date.now() - cached.at < ADMIN_CACHE_TTL;
      let isAdmin = fresh ? cached!.isAdmin : false;
      if (!fresh) {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (error) return { ok: false, reason: "error", message: error.message };
        isAdmin = !!data;
        cachedAdminCheck = { userId: session.user.id, isAdmin, at: Date.now() };
      }
      if (!isAdmin) return { ok: false, reason: "not-admin" };
    }

    return { ok: true, userId: session.user.id, email: session.user.email ?? null };
  } catch (e: unknown) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

/** Reset cached admin check (call on sign out / role change). */
export function clearAuthGuardCache() {
  cachedAdminCheck = null;
}

/**
 * Wrap a Supabase fetcher so it only runs when the user is authed (and
 * optionally admin). Returns `null` when the guard fails — callers should
 * treat `null` as "not allowed / not ready" and skip downstream state updates.
 */
export async function withAuthGuard<T>(
  fetcher: (ctx: { userId: string }) => Promise<T>,
  opts: { requireAdmin?: boolean } = {},
): Promise<T | null> {
  const guard = await ensureAuthed(opts);
  if (!guard.ok) return null;
  return fetcher({ userId: guard.userId });
}