import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "admin" | "manager" | "designer" | "sales" | "accounts" | "installer";

export interface Permissions {
  overview: boolean;
  pipeline: boolean;
  leads: boolean;
  quotation: boolean;
  messages: boolean;
  finance: boolean;
  settings: boolean;
  branding: boolean;
  team: boolean;
  vendors: boolean;
  projects: boolean;
  marketing: boolean;
}

const DEFAULT: Permissions = {
  overview: true, pipeline: true, leads: true, quotation: true, messages: true,
  finance: false, settings: false, branding: false, team: false,
  vendors: false, projects: false, marketing: false,
};

const ADMIN_PERMISSIONS: Permissions = {
  overview: true, pipeline: true, leads: true, quotation: true, messages: true,
  finance: true, settings: true, branding: true, team: true,
  vendors: true, projects: true, marketing: true,
};

export function useCurrentUserPermissions() {
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ id: string; full_name: string | null; email: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { if (!cancelled) setLoading(false); return; }
      const [{ data: prof }, { data: rs }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, permissions").eq("id", session.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      ]);
      if (cancelled) return;
      if (prof) {
        setProfile({ id: prof.id, full_name: prof.full_name, email: prof.email });
        setPermissions({ ...DEFAULT, ...((prof.permissions as Partial<Permissions>) ?? {}) });
      } else {
        setProfile({ id: session.user.id, full_name: null, email: session.user.email ?? null });
      }
      setRoles((rs ?? []).map(r => r.role as AppRole));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const isAdmin = roles.includes("admin") || roles.includes("owner");
  const isManager = roles.includes("manager");
  const isOwner = roles.includes("owner") || roles.includes("admin");
  const isAccounts = roles.includes("accounts");
  // Admins implicitly have everything
  const effective = useMemo<Permissions>(
    () => (isAdmin ? ADMIN_PERMISSIONS : permissions),
    [isAdmin, permissions]
  );

  return { loading, permissions: effective, roles, isAdmin, isManager, isOwner, isAccounts, profile };
}
