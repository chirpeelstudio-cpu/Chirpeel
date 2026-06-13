// Plan entitlements — single source of truth shared by UI gates and copy.
// Server-side mirror lives in `public.plan_limit()` (see migration).

export type PlanId = "free" | "pro" | "studio";
export type LimitKind = "lead" | "quote" | "project" | "team_member";

export interface PlanLimits {
  team: number;
  leadsPerMonth: number;
  quotesPerMonth: number;
  activeProjects: number;
  customPdfThemes: boolean;
  webhooksApi: boolean;
  activityLog: boolean;
}

export const UNLIMITED = Number.POSITIVE_INFINITY;

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    team: 1,
    leadsPerMonth: 25,
    quotesPerMonth: 5,
    activeProjects: 2,
    customPdfThemes: false,
    webhooksApi: false,
    activityLog: false,
  },
  pro: {
    team: 5,
    leadsPerMonth: UNLIMITED,
    quotesPerMonth: UNLIMITED,
    activeProjects: 25,
    customPdfThemes: false,
    webhooksApi: false,
    activityLog: true,
  },
  studio: {
    team: 25,
    leadsPerMonth: UNLIMITED,
    quotesPerMonth: UNLIMITED,
    activeProjects: UNLIMITED,
    customPdfThemes: true,
    webhooksApi: true,
    activityLog: true,
  },
};

export const PLAN_LABEL: Record<PlanId, string> = {
  free: "Free",
  pro: "Pro",
  studio: "Studio",
};

// Cheapest plan that lifts the given limit above the supplied current usage.
export function nextPlanFor(kind: LimitKind, current: PlanId): PlanId {
  const order: PlanId[] = ["free", "pro", "studio"];
  const startIdx = order.indexOf(current) + 1;
  for (let i = startIdx; i < order.length; i++) {
    const p = order[i];
    const l = limitFor(p, kind);
    if (l === UNLIMITED || l > limitFor(current, kind)) return p;
  }
  return "studio";
}

export function limitFor(plan: PlanId, kind: LimitKind): number {
  const l = PLAN_LIMITS[plan];
  switch (kind) {
    case "lead":        return l.leadsPerMonth;
    case "quote":       return l.quotesPerMonth;
    case "project":     return l.activeProjects;
    case "team_member": return l.team;
  }
}

export function limitLabel(kind: LimitKind): string {
  switch (kind) {
    case "lead":        return "leads this month";
    case "quote":       return "quotations this month";
    case "project":     return "active projects";
    case "team_member": return "team members";
  }
}

export function actionLabel(kind: LimitKind): string {
  switch (kind) {
    case "lead":        return "Add lead";
    case "quote":       return "Create quotation";
    case "project":     return "Create project";
    case "team_member": return "Invite member";
  }
}

export function isPlanLimitError(err: unknown): boolean {
  const m = (err as { message?: string })?.message ?? String(err ?? "");
  return m.includes("PLAN_LIMIT_REACHED");
}