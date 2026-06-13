import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Users, TrendingUp, Activity, CheckCircle2, FileText, Wallet, Receipt,
  IndianRupee, AlertTriangle, RefreshCw, ArrowRight, Clock, PieChart, Target
} from "lucide-react";
import { KPICard } from "./overview/KPICard";
import { LeadTrendChart } from "./overview/LeadTrendChart";
import { SourceDonut } from "./overview/SourceDonut";
import { ActivityFeed, type ActivityEvent } from "./overview/ActivityFeed";
import MyTasksCard from "./tasks/MyTasksCard";
import { DateRangePicker } from "./overview/DateRangePicker";
import { GoalProgress } from "./overview/GoalProgress";
import { CohortFunnel } from "./overview/CohortFunnel";
import {
  formatINR, formatINRFull, startOfDay, startOfWeek, startOfMonth, startOfYear,
  totalCollectedForLead, rangeFromPreset, previousRange, inRange, pctDelta,
  type DateRange,
} from "./overview/utils";
import { STAGES } from "./constants";
import type { PipelineLead } from "./types";
import type { AdminView } from "./AdminSidebar";
import { useAppSettings } from "@/hooks/useAppSettings";

interface QuotationRow {
  id: string;
  quotation_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  sales_person: string | null;
  created_at: string;
  sent_at: string | null;
}

interface Props {
  onNavigate: (view: AdminView) => void;
}

const RANGE_KEY = "overview.range.preset";

export default function OverviewDashboard({ onNavigate }: Props) {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useAppSettings();

  const [range, setRange] = useState<DateRange>(() => {
    const saved = (typeof window !== "undefined" ? localStorage.getItem(RANGE_KEY) : null) as any;
    return rangeFromPreset(saved && saved !== "custom" ? saved : "this_month");
  });

  useEffect(() => {
    if (range.preset !== "custom") localStorage.setItem(RANGE_KEY, range.preset);
  }, [range.preset]);

  const fetchAll = async () => {
    setLoading(true);
    const [leadsRes, quotsRes] = await Promise.all([
      supabase.from("leads").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("quotations").select("id, quotation_number, customer_name, total_amount, status, sales_person, created_at, sent_at").is("deleted_at", null).order("created_at", { ascending: false }),
    ]);
    setLeads((leadsRes.data ?? []) as unknown as PipelineLead[]);
    setQuotations((quotsRes.data ?? []) as QuotationRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Drill-down navigation: stash a filter in localStorage for the destination module
  const drillTo = (view: AdminView, filter: Record<string, any>) => {
    try { localStorage.setItem("admin.drillFilter", JSON.stringify({ view, filter, ts: Date.now() })); } catch {}
    onNavigate(view);
  };

  const profitMargin = (settings.profit_margin_alert_pct ?? 25) / 100;

  const stats = useMemo(() => {
    const now = new Date();
    const sToday = startOfDay(now).getTime();
    const sWeek = startOfWeek(now).getTime();
    const sMonth = startOfMonth(now).getTime();
    const sYear = startOfYear(now).getTime();

    const prev = previousRange(range);

    // Range-scoped lead counts
    const leadsInRange = leads.filter(l => inRange(l.created_at, range));
    const leadsInPrev  = leads.filter(l => inRange(l.created_at, prev));

    // Range-scoped quotation totals
    const quotsInRange = quotations.filter(q => inRange(q.created_at, range));
    const quotsInPrev  = quotations.filter(q => inRange(q.created_at, prev));
    const quotedValueRange = quotsInRange.reduce((s, q) => s + Number(q.total_amount ?? 0), 0);
    const quotedValuePrev  = quotsInPrev.reduce((s, q) => s + Number(q.total_amount ?? 0), 0);

    // Range-scoped revenue (proxy: leads whose row was created in range, since payment timestamps don't exist on the lead)
    const collectedRange = leadsInRange.reduce((s, l) => s + totalCollectedForLead(l), 0);
    const collectedPrev  = leadsInPrev.reduce((s, l) => s + totalCollectedForLead(l), 0);
    const profitRange    = collectedRange * profitMargin;

    // Conversion within the range cohort
    const completedRange = leadsInRange.filter(l => l.stage === "completed").length;
    const completedPrev  = leadsInPrev.filter(l => l.stage === "completed").length;
    const convRange = leadsInRange.length ? (completedRange / leadsInRange.length) * 100 : 0;
    const convPrev  = leadsInPrev.length  ? (completedPrev  / leadsInPrev.length)  * 100 : 0;

    // All-time figures (still useful for some sections)
    const totalLeads = leads.length;
    const leadsToday = leads.filter(l => new Date(l.created_at).getTime() >= sToday).length;
    const leadsWeek = leads.filter(l => new Date(l.created_at).getTime() >= sWeek).length;
    const leadsMonth = leads.filter(l => new Date(l.created_at).getTime() >= sMonth).length;
    const collectedMonth = leads.filter(l => new Date(l.created_at).getTime() >= sMonth).reduce((s, l) => s + totalCollectedForLead(l), 0);
    const collectedYear  = leads.filter(l => new Date(l.created_at).getTime() >= sYear).reduce((s, l) => s + totalCollectedForLead(l), 0);
    const collectedWeek  = leads.filter(l => new Date(l.created_at).getTime() >= sWeek).reduce((s, l) => s + totalCollectedForLead(l), 0);
    const collectedAll   = leads.reduce((s, l) => s + totalCollectedForLead(l), 0);

    const activeProjects = leads.filter(l => l.stage && l.stage !== "leads" && l.stage !== "completed").length;
    const completedLeads = leads.filter(l => l.stage === "completed");
    const conversionRateAll = totalLeads > 0 ? (completedLeads.length / totalLeads) * 100 : 0;
    const convDays = completedLeads
      .map(l => (new Date().getTime() - new Date(l.created_at).getTime()) / 86400_000)
      .filter(d => d > 0);
    const avgConvDays = convDays.length ? convDays.reduce((a, b) => a + b, 0) / convDays.length : 0;

    // Stage breakdown (all-time)
    const stageCounts = STAGES.map(s => ({
      ...s,
      count: leads.filter(l => (l.stage ?? "leads") === s.key).length,
    }));

    // Source breakdown — scoped to range when not "all"
    const srcSource = range.preset === "all" ? leads : leadsInRange;
    const srcMap = new Map<string, number>();
    srcSource.forEach(l => {
      const s = l.source ?? "unknown";
      srcMap.set(s, (srcMap.get(s) ?? 0) + 1);
    });
    const sourceData = Array.from(srcMap.entries())
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
      .sort((a, b) => b.value - a.value);

    // City breakdown (all-time)
    const cityMap = new Map<string, number>();
    leads.forEach(l => {
      const c = l.city?.trim() || "Unknown";
      cityMap.set(c, (cityMap.get(c) ?? 0) + 1);
    });
    const topCities = Array.from(cityMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Monthly trend (last 12 months)
    const monthly: { label: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = leads.filter(l => {
        const t = new Date(l.created_at).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      monthly.push({ label: d.toLocaleDateString("en-IN", { month: "short" }), value: count });
    }

    // Daily trend (last 30 days)
    const daily: { label: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(sToday - i * 86400_000);
      const t0 = d.getTime(), t1 = t0 + 86400_000;
      const count = leads.filter(l => {
        const t = new Date(l.created_at).getTime();
        return t >= t0 && t < t1;
      }).length;
      daily.push({ label: d.getDate().toString(), value: count });
    }

    // Quotations all-time aggregates
    const totalQuotValue = quotations.reduce((s, q) => s + Number(q.total_amount ?? 0), 0);
    const avgTicket = quotations.length ? totalQuotValue / quotations.length : 0;
    const quotByStatus = {
      draft: quotations.filter(q => q.status === "draft").length,
      sent: quotations.filter(q => q.status === "sent").length,
      approved: quotations.filter(q => q.status === "approved").length,
      rejected: quotations.filter(q => q.status === "rejected").length,
    };
    const poRaised = quotations
      .filter(q => q.status === "sent" || q.status === "approved")
      .reduce((s, q) => s + Number(q.total_amount ?? 0), 0);
    const outstanding = Math.max(poRaised - collectedAll, 0);

    const sumMilestone = (key: "10" | "50" | "100") => {
      const ampKey = `payment_${key}_amount` as const;
      const flagKey = `payment_${key}_percent` as const;
      return leads.reduce((s, l) => s + (l[flagKey] ? Number(l[ampKey] ?? 0) : 0), 0);
    };
    const milestones = [
      { key: "10", label: "10% Advance", count: leads.filter(l => l.payment_10_percent).length, sum: sumMilestone("10") },
      { key: "50", label: "50% Stage",   count: leads.filter(l => l.payment_50_percent).length, sum: sumMilestone("50") },
      { key: "100", label: "100% Final", count: leads.filter(l => l.payment_100_percent).length, sum: sumMilestone("100") },
    ];

    const topProjects = leads
      .map(l => ({ id: l.id, name: l.name, city: l.city, total: totalCollectedForLead(l) }))
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Today's actions
    const quotsToday = quotations.filter(q => new Date(q.created_at).getTime() >= sToday).length;
    const paymentsToday = leads.filter(l => totalCollectedForLead(l) > 0 && new Date(l.created_at).getTime() >= sToday).length;
    const overdue = leads.filter(l => l.next_followup_date && new Date(l.next_followup_date).getTime() < Date.now() && l.stage !== "completed").length;
    const stale = quotations.filter(q => q.status === "draft" && (Date.now() - new Date(q.created_at).getTime()) > 3 * 86400_000).length;

    // Activity feed (all-time, latest)
    const events: ActivityEvent[] = [];
    leads.slice(0, 10).forEach(l => events.push({ type: "lead", title: `New lead: ${l.name}`, sub: `${l.city ?? "—"} · ${l.source ?? "—"}`, at: l.created_at }));
    quotations.slice(0, 10).forEach(q => events.push({ type: "quotation", title: `Quotation ${q.quotation_number}`, sub: `${q.customer_name} · ${q.status}`, amount: Number(q.total_amount), at: q.created_at }));
    leads.filter(l => totalCollectedForLead(l) > 0).slice(0, 10).forEach(l => events.push({ type: "payment", title: `Payment from ${l.name}`, sub: l.city ?? "—", amount: totalCollectedForLead(l), at: l.created_at }));
    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    const recentEvents = events.slice(0, 12);

    // Team performance
    const salesMap = new Map<string, { count: number; value: number }>();
    quotations.forEach(q => {
      const key = q.sales_person?.trim() || "Unassigned";
      const cur = salesMap.get(key) ?? { count: 0, value: 0 };
      cur.count += 1; cur.value += Number(q.total_amount ?? 0);
      salesMap.set(key, cur);
    });
    const salesPerformance = Array.from(salesMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.value - a.value);

    const assignMap = new Map<string, { total: number; completed: number }>();
    leads.forEach(l => {
      const key = l.assigned_to?.trim() || "Unassigned";
      const cur = assignMap.get(key) ?? { total: 0, completed: 0 };
      cur.total += 1; if (l.stage === "completed") cur.completed += 1;
      assignMap.set(key, cur);
    });
    const teamLeadPerformance = Array.from(assignMap.entries())
      .map(([name, v]) => ({ name, total: v.total, completed: v.completed, rate: v.total ? (v.completed / v.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);

    // Deltas
    const dLeads = pctDelta(leadsInRange.length, leadsInPrev.length);
    const dQuotedValue = pctDelta(quotedValueRange, quotedValuePrev);
    const dCollected = pctDelta(collectedRange, collectedPrev);
    const dProfit = pctDelta(profitRange, collectedPrev * profitMargin);
    const dConv = pctDelta(convRange, convPrev);
    const dQuotsCount = pctDelta(quotsInRange.length, quotsInPrev.length);

    return {
      // range-scoped
      leadsInRange: leadsInRange.length, dLeads,
      quotsInRange: quotsInRange.length, dQuotsCount,
      quotedValueRange, dQuotedValue,
      collectedRange, dCollected,
      profitRange, dProfit,
      convRange, dConv,
      // all-time
      totalLeads, leadsToday, leadsWeek, leadsMonth,
      activeProjects, conversionRateAll, avgConvDays,
      stageCounts, sourceData, topCities, monthly, daily,
      quotations: { count: quotations.length, totalValue: totalQuotValue, avgTicket, byStatus: quotByStatus },
      poRaised, collectedAll, collectedYear, collectedMonth, collectedWeek, outstanding,
      milestones, topProjects,
      quotsToday, paymentsToday, overdue, stale,
      recentEvents,
      salesPerformance, teamLeadPerformance,
    };
  }, [leads, quotations, range, profitMargin]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const maxStage = Math.max(...stats.stageCounts.map(s => s.count), 1);
  const marginPct = Math.round(profitMargin * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-foreground">Business Overview</h2>
          <p className="text-xs text-muted-foreground">Showing data for <span className="font-medium text-foreground">{range.label}</span> · compared with previous period.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker value={range} onChange={setRange} />
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Goal tracking */}
      <GoalProgress
        leadsThisMonth={stats.leadsMonth}
        revenueThisMonth={stats.collectedMonth}
        leadTarget={settings.monthly_lead_target}
        revenueTarget={settings.monthly_revenue_target}
        onEdit={() => onNavigate("settings")}
      />

      {/* Row A — Headline KPIs (scoped to range with deltas) */}
      <div data-tour-id="overview-kpis" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Leads" value={stats.leadsInRange} sub={range.label} icon={Users} tone="blue"
                 delta={{ value: stats.dLeads.value, direction: stats.dLeads.direction, label: "vs prev" }}
                 onClick={() => onNavigate("leads")} />
        <KPICard label="Quotations" value={stats.quotsInRange} sub={`${formatINR(stats.quotedValueRange)} value`} icon={FileText} tone="amber"
                 delta={{ value: stats.dQuotsCount.value, direction: stats.dQuotsCount.direction, label: "vs prev" }}
                 onClick={() => onNavigate("quotation")} />
        <KPICard label="Quoted Value" value={formatINR(stats.quotedValueRange)} sub={range.label} icon={Receipt} tone="amber"
                 delta={{ value: stats.dQuotedValue.value, direction: stats.dQuotedValue.direction, label: "vs prev" }} />
        <KPICard label="Collected" value={formatINR(stats.collectedRange)} sub={range.label} icon={IndianRupee} tone="green"
                 delta={{ value: stats.dCollected.value, direction: stats.dCollected.direction, label: "vs prev" }}
                 onClick={() => onNavigate("finance")} />
        <KPICard label="Profit (est)" value={formatINR(stats.profitRange)} sub={`${marginPct}% margin`} icon={TrendingUp} tone="green"
                 delta={{ value: stats.dProfit.value, direction: stats.dProfit.direction, label: "vs prev" }} />
        <KPICard label="Conversion" value={`${stats.convRange.toFixed(1)}%`} sub={`Cohort in ${range.label.toLowerCase()}`} icon={CheckCircle2} tone="purple"
                 delta={{ value: stats.dConv.value, direction: stats.dConv.direction, label: "vs prev" }} />
      </div>

      {/* Pipeline snapshot (all-time) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Leads" value={stats.totalLeads} sub="All-time" icon={Users} tone="slate" onClick={() => onNavigate("leads")} />
        <KPICard label="Active Projects" value={stats.activeProjects} sub="In pipeline" icon={Target} tone="purple" onClick={() => onNavigate("pipeline")} />
        <KPICard label="Avg. Cycle" value={`${stats.avgConvDays.toFixed(0)}d`} sub="Lead → Won" icon={Activity} tone="blue" />
        <KPICard label="All-time Conv" value={`${stats.conversionRateAll.toFixed(1)}%`} sub={`${stats.totalLeads} leads`} icon={CheckCircle2} tone="green" />
      </div>

      {/* Row B — Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <PieChart className="h-4 w-4" /> Pipeline Stage Breakdown
          </h3>
          <div className="space-y-2">
            {stats.stageCounts.map(s => {
              const pct = stats.totalLeads ? (s.count / stats.totalLeads) * 100 : 0;
              return (
                <button
                  key={s.key}
                  onClick={() => drillTo("pipeline", { stage: s.key })}
                  className="w-full text-left rounded-md p-1.5 hover:bg-accent transition-colors"
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${s.color}`} /> {s.label}
                    </span>
                    <span className="text-muted-foreground">{s.count} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className={`h-full ${s.color}`} style={{ width: `${(s.count / maxStage) * 100}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <SourceDonut title={`Lead Sources · ${range.label}`} data={stats.sourceData} />
      </div>

      {/* Cohort funnel */}
      <CohortFunnel leads={leads} quotations={quotations} />

      {/* City breakdown */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Top Cities</h3>
        {stats.topCities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No city data yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.topCities.map(c => (
              <div key={c.name} className="border rounded-md p-3 text-center">
                <p className="text-xs text-muted-foreground truncate">{c.name}</p>
                <p className="text-xl font-bold text-foreground">{c.count}</p>
                <p className="text-[10px] text-muted-foreground">leads</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Row C — Trends */}
      <div data-tour-id="overview-trend" className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <LeadTrendChart title="Leads — Last 12 Months" data={stats.monthly} variant="bar" color="hsl(217 91% 60%)" />
        <LeadTrendChart title="Leads — Last 30 Days" data={stats.daily} variant="line" color="hsl(160 84% 39%)" />
        <div data-tour-id="overview-tasks"><MyTasksCard /></div>
      </div>

      {/* Financial all-time strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Total Quoted" value={formatINR(stats.quotations.totalValue)} sub={`Avg ${formatINR(stats.quotations.avgTicket)}`} icon={Receipt} tone="amber" onClick={() => onNavigate("quotation")} />
        <KPICard label="PO Raised" value={formatINR(stats.poRaised)} sub="Sent + Approved" icon={Wallet} tone="purple" />
        <KPICard label="Collected" value={formatINR(stats.collectedAll)} sub={`${formatINR(stats.collectedYear)} this yr`} icon={IndianRupee} tone="green" onClick={() => onNavigate("finance")} />
        <KPICard label="Outstanding" value={formatINR(stats.outstanding)} sub="PO − Collected" icon={AlertTriangle} tone="red"
                 delta={{ value: 0, direction: "flat" }} />
        <KPICard label="Revenue MTD" value={formatINR(stats.collectedMonth)} sub={`${formatINR(stats.collectedWeek)} this wk`} icon={TrendingUp} tone="green" />
        <KPICard label="Quotations" value={stats.quotations.count} sub="All-time" icon={FileText} tone="amber" onClick={() => onNavigate("quotation")} />
      </div>

      {/* Quotation status breakdown */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quotation Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatusTile label="Draft" count={stats.quotations.byStatus.draft} cls="bg-slate-50 border-slate-200 text-slate-700" onClick={() => drillTo("quotation", { status: "draft" })} />
          <StatusTile label="Sent" count={stats.quotations.byStatus.sent} cls="bg-blue-50 border-blue-200 text-blue-700" onClick={() => drillTo("quotation", { status: "sent" })} />
          <StatusTile label="Approved" count={stats.quotations.byStatus.approved} cls="bg-emerald-50 border-emerald-200 text-emerald-700" onClick={() => drillTo("quotation", { status: "approved" })} />
          <StatusTile label="Rejected" count={stats.quotations.byStatus.rejected} cls="bg-red-50 border-red-200 text-red-700" onClick={() => drillTo("quotation", { status: "rejected" })} />
        </div>
      </Card>

      {/* Row E — Payment milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-3">Payment Milestones</h3>
          <div className="space-y-4">
            {stats.milestones.map(m => {
              const total = Math.max(...stats.milestones.map(x => x.sum), 1);
              return (
                <div key={m.key}>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-medium text-foreground">{m.label}</span>
                    <span className="text-muted-foreground">{m.count} leads · <span title={formatINRFull(m.sum)}>{formatINR(m.sum)}</span></span>
                  </div>
                  <Progress value={(m.sum / total) * 100} className="h-2" />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 Projects</h3>
          {stats.topProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No payments yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topProjects.map((p, i) => (
                <li key={p.id} className="flex justify-between items-center gap-2 border-b last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{i + 1}. {p.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.city ?? "—"}</p>
                  </div>
                  <Badge variant="secondary" title={formatINRFull(p.total)}>{formatINR(p.total)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Row F — Activity & Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Today & Operations
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <OpTile label="New Leads" value={stats.leadsToday} cls="text-blue-700 bg-blue-50 border-blue-200" onClick={() => drillTo("leads", { sinceToday: true })} />
            <OpTile label="Quotations" value={stats.quotsToday} cls="text-amber-700 bg-amber-50 border-amber-200" onClick={() => onNavigate("quotation")} />
            <OpTile label="Payments" value={stats.paymentsToday} cls="text-emerald-700 bg-emerald-50 border-emerald-200" onClick={() => onNavigate("finance")} />
            <OpTile label="Overdue Follow-ups" value={stats.overdue} cls="text-red-700 bg-red-50 border-red-200" onClick={() => drillTo("pipeline", { overdueOnly: true })} />
          </div>
          {stats.stale > 0 && (
            <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{stats.stale} draft quotation{stats.stale > 1 ? "s" : ""} pending send for over 3 days.</span>
              <Button variant="link" size="sm" className="ml-auto h-auto p-0 text-amber-900" onClick={() => drillTo("quotation", { status: "draft" })}>Review →</Button>
            </div>
          )}
        </Card>

        <div data-tour-id="overview-activity"><ActivityFeed events={stats.recentEvents} /></div>
      </div>

      {/* Row G — Team Performance */}
      {(stats.salesPerformance.length > 0 || stats.teamLeadPerformance.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quotations by Sales Person</h3>
            {stats.salesPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quotations yet.</p>
            ) : (
              <ul className="space-y-2">
                {stats.salesPerformance.map(p => (
                  <li key={p.name} className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.count} quotation{p.count !== 1 ? "s" : ""}</p>
                    </div>
                    <Badge variant="outline" title={formatINRFull(p.value)}>{formatINR(p.value)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Leads by Assignee</h3>
            {stats.teamLeadPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assigned leads.</p>
            ) : (
              <ul className="space-y-2">
                {stats.teamLeadPerformance.map(p => (
                  <li key={p.name} className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.completed}/{p.total} completed</p>
                    </div>
                    <Badge variant="outline">{p.rate.toFixed(0)}%</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* Row H — Quick Links */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Links</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate("pipeline")}>Pipeline <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate("leads")}>All Leads <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate("quotation")}>Quotations <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate("finance")}>Finance <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate("settings")}>Settings <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
        </div>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Profit estimate uses a {marginPct}% margin from <button className="underline" onClick={() => onNavigate("settings")}>Settings → Company Defaults</button>.
      </p>
    </div>
  );
}

function StatusTile({ label, count, cls, onClick }: { label: string; count: number; cls: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-md border p-3 text-center transition-shadow ${cls} ${onClick ? "hover:shadow-md cursor-pointer" : ""}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-[11px] uppercase tracking-wide">{label}</p>
    </button>
  );
}

function OpTile({ label, value, cls, onClick }: { label: string; value: number; cls: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-md border p-3 text-center transition-shadow ${cls} ${onClick ? "hover:shadow-md cursor-pointer" : ""}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] uppercase tracking-wide">{label}</p>
    </button>
  );
}
