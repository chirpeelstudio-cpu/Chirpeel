import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, FileText, FolderKanban, UserPlus, Infinity as InfinityIcon } from "lucide-react";
import { useEntitlements } from "@/hooks/useEntitlements";
import {
  PLAN_LABEL,
  UNLIMITED,
  limitFor,
  type LimitKind,
  type PlanId,
} from "@/lib/planEntitlements";
import UpgradeDialog from "./UpgradeDialog";

const ROWS: Array<{ kind: LimitKind; label: string; icon: typeof Users }> = [
  { kind: "lead",        label: "Leads this month",       icon: Users },
  { kind: "quote",       label: "Quotations this month",  icon: FileText },
  { kind: "project",     label: "Active projects",        icon: FolderKanban },
  { kind: "team_member", label: "Team members",           icon: UserPlus },
];

function planBadgeTone(plan: PlanId) {
  if (plan === "studio") return "bg-primary text-primary-foreground";
  if (plan === "pro") return "bg-primary/15 text-primary border border-primary/30";
  return "bg-muted text-muted-foreground";
}

interface Props {
  /** Compact variant (used inside cards). */
  compact?: boolean;
}

export default function UsageOverviewPanel({ compact = false }: Props) {
  const ent = useEntitlements();
  const [dialogKind, setDialogKind] = useState<LimitKind | null>(null);

  const usageFor = (kind: LimitKind): number => {
    switch (kind) {
      case "lead":        return ent.usage.leadsThisMonth;
      case "quote":       return ent.usage.quotesThisMonth;
      case "project":     return ent.usage.activeProjects;
      case "team_member": return ent.usage.teamMembers;
    }
  };

  const anyAtLimit = ROWS.some((r) => !ent.canCreate(r.kind));

  return (
    <div className={`rounded-2xl border border-border bg-background ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
            Plan & usage
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planBadgeTone(ent.plan)}`}>
              {PLAN_LABEL[ent.plan]} plan
            </span>
            {ent.status && ent.plan !== "free" && (
              <span className="text-[10px] text-muted-foreground capitalize">{ent.status}</span>
            )}
          </div>
        </div>
        {ent.plan !== "studio" && (
          <Button
            size="sm"
            variant={anyAtLimit ? "default" : "outline"}
            className="gap-1.5 h-7"
            onClick={() => setDialogKind(anyAtLimit ? (ROWS.find((r) => !ent.canCreate(r.kind))!.kind) : "lead")}
          >
            <Sparkles className="w-3.5 h-3.5" /> Upgrade
          </Button>
        )}
      </div>

      <ul className="space-y-2.5">
        {ROWS.map(({ kind, label, icon: Icon }) => {
          const limit = limitFor(ent.plan, kind);
          const used = usageFor(kind);
          const unlimited = limit === UNLIMITED;
          const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
          const remaining = unlimited ? Infinity : Math.max(0, limit - used);
          const atLimit = !unlimited && used >= limit;
          const near = !unlimited && !atLimit && pct >= 70;

          return (
            <li key={kind} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums text-foreground">
                    {used}
                    <span className="text-muted-foreground font-normal">
                      {" / "}
                      {unlimited ? <InfinityIcon className="inline w-3 h-3 -mt-0.5" /> : limit}
                    </span>
                  </span>
                  {atLimit && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Limit</Badge>}
                  {near && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{pct}%</Badge>}
                </div>
              </div>
              {!unlimited && (
                <Progress
                  value={pct}
                  className={`h-1.5 ${atLimit ? "[&>div]:bg-destructive" : near ? "[&>div]:bg-amber-500" : ""}`}
                />
              )}
              {atLimit && (
                <button
                  type="button"
                  onClick={() => setDialogKind(kind)}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Upgrade to add more →
                </button>
              )}
              {!atLimit && !unlimited && remaining <= 5 && (
                <p className="text-[10px] text-muted-foreground">{remaining} left</p>
              )}
            </li>
          );
        })}
      </ul>

      {ent.plan === "studio" && (
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          You're on the top tier — no limits to worry about.
        </p>
      )}

      {dialogKind && (
        <UpgradeDialog
          open={!!dialogKind}
          onOpenChange={(o) => !o && setDialogKind(null)}
          kind={dialogKind}
          currentPlan={ent.plan}
          currentUsage={usageFor(dialogKind)}
        />
      )}
    </div>
  );
}