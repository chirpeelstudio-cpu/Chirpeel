import { supabase } from "@/integrations/supabase/client";
import { safeRedirectTarget } from "@/lib/safe-redirect";

/**
 * Decide where a freshly authenticated user should land.
 *
 * Order of resolution:
 *  1. If `requested` is a safe path the user is allowed to view, use it.
 *  2. If onboarding hasn't been completed → `/onboarding`.
 *  3. If user has admin/manager role → `/app`.
 *  4. Otherwise → `/profile` (a non-admin authenticated landing).
 *
 * Always returns a safe in-app path. Never throws.
 */
export async function resolvePostAuthDestination(
  requested?: string | null,
): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return "/login";

    // Multi-tenant: check whether this user belongs to a tenant (= studio).
    // No tenant ⇒ they need onboarding to create their own studio.
    const [{ data: membership }, { data: roles }] = await Promise.all([
      supabase
        .from("tenant_members" as never)
        .select("tenant_id")
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", session.user.id),
    ]);

    const hasTenant = !!(membership as any)?.tenant_id;
    if (!hasTenant) return "/onboarding";

    // Once they have a tenant, check that tenant's company settings for onboarding completion
    const { data: cs } = await supabase
      .from("company_settings")
      .select("company_name, onboarding_completed_at")
      .limit(1)
      .maybeSingle();
    const onboarded = !!(cs?.onboarding_completed_at && cs?.company_name);
    const roleSet = new Set((roles ?? []).map((r) => r.role as string));
    const isPrivileged = roleSet.has("admin") || roleSet.has("manager");

    // 1. Honor an explicit redirect, but only if the user can actually use it.
    const safeRequested = requested
      ? safeRedirectTarget(requested, "")
      : "";
    if (safeRequested) {
      const wantsAdminArea = safeRequested === "/app" || safeRequested.startsWith("/app/");
      if (!wantsAdminArea || isPrivileged) {
        if (onboarded || !wantsAdminArea) return safeRequested;
      }
    }

    if (!onboarded) return "/onboarding";
    if (isPrivileged) return "/app";
    return "/profile";
  } catch {
    return "/onboarding";
  }
}