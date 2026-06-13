import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PLAN_LIMITS,
  UNLIMITED,
  limitFor,
  type PlanId,
  type LimitKind,
} from "@/lib/planEntitlements";

export interface EntitlementsState {
  loading: boolean;
  plan: PlanId;
  status: string | null;
  usage: {
    leadsThisMonth: number;
    quotesThisMonth: number;
    activeProjects: number;
    teamMembers: number;
  };
  canCreate: (kind: LimitKind) => boolean;
  remaining: (kind: LimitKind) => number;
  reload: () => Promise<void>;
}

export function useEntitlements(): EntitlementsState {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanId>("free");
  const [status, setStatus] = useState<string | null>(null);
  const [usage, setUsage] = useState({
    leadsThisMonth: 0,
    quotesThisMonth: 0,
    activeProjects: 0,
    teamMembers: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthIso = monthStart.toISOString();

      const [subRes, leadsRes, quotesRes, projectsRes, membersRes] = await Promise.all([
        supabase.rpc("get_my_subscription"),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .gte("created_at", monthIso),
        supabase
          .from("quotations")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .gte("created_at", monthIso),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .not("status", "in", "(completed,cancelled,archived)"),
        supabase.from("tenant_members").select("user_id", { count: "exact", head: true }),
      ]);

      const subRow = Array.isArray(subRes.data) ? subRes.data[0] : subRes.data;
      const sub = subRow as { plan?: string; status?: string } | null;
      const liveStatuses = ["active", "authenticated", "pending"];
      if (sub?.plan && liveStatuses.includes(sub.status ?? "")) {
        setPlan((sub.plan as PlanId) ?? "free");
      } else {
        setPlan("free");
      }
      setStatus(sub?.status ?? null);

      setUsage({
        leadsThisMonth: leadsRes.count ?? 0,
        quotesThisMonth: quotesRes.count ?? 0,
        activeProjects: projectsRes.count ?? 0,
        teamMembers: membersRes.count ?? 0,
      });
    } catch (e) {
      console.error("useEntitlements load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("entitlements:refresh", onChange);
    return () => window.removeEventListener("entitlements:refresh", onChange);
  }, [load]);

  const usageFor = useCallback(
    (kind: LimitKind): number => {
      switch (kind) {
        case "lead":        return usage.leadsThisMonth;
        case "quote":       return usage.quotesThisMonth;
        case "project":     return usage.activeProjects;
        case "team_member": return usage.teamMembers;
      }
    },
    [usage],
  );

  const canCreate = useCallback(
    (kind: LimitKind) => {
      const limit = limitFor(plan, kind);
      if (limit === UNLIMITED) return true;
      return usageFor(kind) < limit;
    },
    [plan, usageFor],
  );

  const remaining = useCallback(
    (kind: LimitKind) => {
      const limit = limitFor(plan, kind);
      if (limit === UNLIMITED) return UNLIMITED;
      return Math.max(0, limit - usageFor(kind));
    },
    [plan, usageFor],
  );

  return { loading, plan, status, usage, canCreate, remaining, reload: load };
}

/** Trigger a refetch in any mounted useEntitlements hook. */
export function refreshEntitlements() {
  window.dispatchEvent(new Event("entitlements:refresh"));
}

export { PLAN_LIMITS };