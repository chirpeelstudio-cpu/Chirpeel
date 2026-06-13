import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { STAGES } from "../constants";
import type { PipelineLead } from "../types";
import { formatINR, totalCollectedForLead } from "./utils";

interface QuotationLite {
  id: string;
  total_amount: number;
  created_at: string;
  status?: string | null;
}

interface Props {
  leads: PipelineLead[];
  quotations?: QuotationLite[];
}

const STAGE_ORDER: string[] = STAGES.map(s => s.key);

function stageIndex(stage: string | null | undefined): number {
  if (!stage) return 0;
  const i = STAGE_ORDER.indexOf(stage);
  return i < 0 ? 0 : i;
}

const MILESTONES: { key: string; label: string }[] = [
  { key: "leads",      label: "Leads" },
  { key: "follow_up",  label: "Follow-up" },
  { key: "site_visit", label: "Site Visit" },
  { key: "booking",    label: "Booking" },
  { key: "designing",  label: "Designing" },
  { key: "completed",  label: "Completed" },
];

export function CohortFunnel({ leads, quotations = [] }: Props) {
  const months = useMemo(() => {
    const now = new Date();
    const out: { label: string; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }
    return out;
  }, []);

  const rows = useMemo(() => {
    return months.map(m => {
      const start = new Date(m.year, m.month, 1).getTime();
      const end = new Date(m.year, m.month + 1, 1).getTime();
      const cohort = leads.filter(l => {
        const t = new Date(l.created_at).getTime();
        return t >= start && t < end;
      });
      const counts: Record<string, number> = {};
      MILESTONES.forEach(ms => {
        const idx = STAGE_ORDER.indexOf(ms.key);
        counts[ms.key] = cohort.filter(l => stageIndex(l.stage) >= idx).length;
      });
      const created = cohort.length;
      const won = counts["completed"] ?? 0;
      const conv = created > 0 ? (won / created) * 100 : 0;

      // Quoted value: quotations created in this month
      const quoted = quotations
        .filter(q => {
          const t = new Date(q.created_at).getTime();
          return t >= start && t < end;
        })
        .reduce((s, q) => s + Number(q.total_amount ?? 0), 0);

      // Collected revenue: payments tagged on leads in this cohort
      const collected = cohort.reduce((s, l) => s + totalCollectedForLead(l as any), 0);

      const collectedPct = quoted > 0 ? (collected / quoted) * 100 : 0;

      return { ...m, created, counts, conv, quoted, collected, collectedPct };
    });
  }, [leads, quotations, months]);

  // Funnel for current month (last row)
  const current = rows[rows.length - 1];
  const maxCount = Math.max(...MILESTONES.map(ms => current.counts[ms.key] ?? 0), 1);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" /> Cohort Funnel
      </h3>

      {/* Current month funnel */}
      <div className="space-y-2 mb-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {current.label} cohort · {current.created} leads · Quoted {formatINR(current.quoted)} · Collected {formatINR(current.collected)}
        </p>
        {MILESTONES.map(ms => {
          const c = current.counts[ms.key] ?? 0;
          const pctOfCreated = current.created > 0 ? (c / current.created) * 100 : 0;
          return (
            <div key={ms.key}>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-foreground">{ms.label}</span>
                <span className="text-muted-foreground">{c} ({pctOfCreated.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(c / maxCount) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 6-month grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-1.5 pr-2 font-medium">Month</th>
              <th className="py-1.5 px-2 text-right font-medium">Created</th>
              <th className="py-1.5 px-2 text-right font-medium">Booking</th>
              <th className="py-1.5 px-2 text-right font-medium">Won</th>
              <th className="py-1.5 px-2 text-right font-medium">Conv %</th>
              <th className="py-1.5 px-2 text-right font-medium">Quoted</th>
              <th className="py-1.5 pl-2 text-right font-medium">Collected</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label} className="border-b last:border-0">
                <td className="py-1.5 pr-2 font-medium text-foreground">{r.label}</td>
                <td className="py-1.5 px-2 text-right">{r.created}</td>
                <td className="py-1.5 px-2 text-right">{r.counts["booking"] ?? 0}</td>
                <td className="py-1.5 px-2 text-right">{r.counts["completed"] ?? 0}</td>
                <td className="py-1.5 px-2 text-right font-semibold text-foreground">{r.conv.toFixed(0)}%</td>
                <td className="py-1.5 px-2 text-right text-muted-foreground">{r.quoted > 0 ? formatINR(r.quoted) : "—"}</td>
                <td className="py-1.5 pl-2 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-emerald-700">{r.collected > 0 ? formatINR(r.collected) : "—"}</span>
                    {r.quoted > 0 && (
                      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${Math.min(100, r.collectedPct)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Stage reach is approximated from each lead's current stage. <span className="font-medium">Quoted</span> sums quotations created that month; <span className="font-medium">Collected</span> sums payments captured against leads in that month's cohort.
      </p>
    </Card>
  );
}
