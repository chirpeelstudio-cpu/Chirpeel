import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Briefcase, Plus, AlertTriangle, CheckCircle2, Pause, Calendar, User,
  ChevronRight, MapPin, IndianRupee, Target, FileText,
  CalendarDays, CalendarRange, CalendarClock,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PROJECT_STATUSES, type Project, type ProjectMilestone } from "./types";
import { EmptyState } from "../shared/EmptyState";
import { cn } from "@/lib/utils";

interface Props {
  projects: Project[];
  poTotals: Map<string, number>;
  loading: boolean;
  onSelect: (p: Project) => void;
  onRefresh: () => void;
  onAdd?: () => void;
}

type Zoom = "week" | "month" | "quarter";
const PX_PER_DAY: Record<Zoom, number> = { week: 24, month: 8, quarter: 3 };
const DAY = 86400000;

const ZOOM_OPTIONS: { key: Zoom; label: string; icon: typeof CalendarDays; hint: string }[] = [
  { key: "week",    label: "Week",    icon: CalendarDays,  hint: "Detailed day-by-day view" },
  { key: "month",   label: "Month",   icon: CalendarRange, hint: "Balanced monthly view" },
  { key: "quarter", label: "Quarter", icon: CalendarClock, hint: "High-level quarterly view" },
];

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function projectRange(p: Project): { start: Date; end: Date } {
  const created = parseDate(p.created_at) ?? new Date();
  const start = parseDate(p.start_date) ?? created;
  const end = parseDate(p.target_end_date) ?? new Date(start.getTime() + 45 * DAY);
  return { start, end: end > start ? end : new Date(start.getTime() + DAY) };
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function nextMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 1); }
function daysBetween(a: Date, b: Date) { return Math.max(1, Math.round((b.getTime() - a.getTime()) / DAY)); }

const MONTH_FMT = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" });
const DATE_FMT  = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

/* ---------------- Shared milestones loader ---------------- */

function useMilestones(projectId: string | null) {
  const [items, setItems] = useState<ProjectMilestone[] | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("project_milestones" as any)
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order")
      .then(({ data }) => {
        if (!cancelled) {
          setItems((data ?? []) as unknown as ProjectMilestone[]);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [projectId]);
  return { items, loading };
}

/* ---------------- Top component ---------------- */

export function ProjectsTimeline({ projects, poTotals, loading, onSelect, onAdd }: Props) {
  const isMobile = useIsMobile();
  const [zoom, setZoom] = useState<Zoom>("month");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!loading && projects.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No projects yet"
        description="Create your first project to plan milestones, tasks and procurement."
        actionLabel={onAdd ? "New Project" : undefined}
        actionIcon={Plus}
        onAction={onAdd}
      />
    );
  }
  if (loading && projects.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">Loading timeline…</p>;
  }

  if (isMobile) {
    return (
      <MobileStack
        projects={projects}
        poTotals={poTotals}
        onSelect={onSelect}
        expanded={expanded}
        onToggle={toggle}
        zoom={zoom}
        setZoom={setZoom}
      />
    );
  }
  return (
    <DesktopGantt
      projects={projects}
      poTotals={poTotals}
      onSelect={onSelect}
      zoom={zoom}
      setZoom={setZoom}
      expanded={expanded}
      onToggle={toggle}
    />
  );
}

/* ---------------- Desktop Gantt ---------------- */

function DesktopGantt({
  projects, poTotals, onSelect, zoom, setZoom, expanded, onToggle,
}: {
  projects: Project[]; poTotals: Map<string, number>; onSelect: (p: Project) => void;
  zoom: Zoom; setZoom: (z: Zoom) => void;
  expanded: Set<string>; onToggle: (id: string) => void;
}) {
  const today = new Date();

  const { rangeStart, rangeEnd, months } = useMemo(() => {
    let min = new Date(today);
    let max = new Date(today);
    projects.forEach(p => {
      const { start, end } = projectRange(p);
      if (start < min) min = start;
      if (end > max) max = end;
    });
    min = startOfMonth(min);
    max = nextMonth(max);
    const ms: Date[] = [];
    let cur = new Date(min);
    while (cur < max) { ms.push(new Date(cur)); cur = nextMonth(cur); }
    return { rangeStart: min, rangeEnd: max, months: ms };
  }, [projects]);

  const pxPerDay = PX_PER_DAY[zoom];
  const totalDays = daysBetween(rangeStart, rangeEnd);
  const trackWidth = totalDays * pxPerDay;
  const todayLeft = ((today.getTime() - rangeStart.getTime()) / DAY) * pxPerDay;

  const ROW_H = 56;
  const LEFT_W = 260;

  return (
    <Card className="overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{DATE_FMT.format(rangeStart)} — {DATE_FMT.format(new Date(rangeEnd.getTime() - DAY))}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:inline">Zoom</span>
          <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 shadow-sm">
            {ZOOM_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = zoom === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setZoom(opt.key)}
                  title={opt.hint}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-semibold transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-auto" style={{ maxHeight: "70vh" }}>
        <div className="flex min-w-max">
          {/* Left rail (sticky) */}
          <div
            className="sticky left-0 z-20 bg-card border-r border-border flex-shrink-0"
            style={{ width: LEFT_W }}
          >
            <div className="h-10 border-b border-border flex items-center px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Project
            </div>
            {projects.map(p => {
              const st = PROJECT_STATUSES.find(s => s.key === p.status);
              const isOpen = expanded.has(p.id);
              return (
                <div key={p.id} className="border-b border-border">
                  <div
                    className="px-2 py-2 hover:bg-muted/40 flex items-center gap-1.5"
                    style={{ height: ROW_H }}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggle(p.id); }}
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                      aria-label={isOpen ? "Collapse" : "Expand"}
                      aria-expanded={isOpen}
                    >
                      <ChevronRight className={cn("w-4 h-4 transition-transform", isOpen && "rotate-90")} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect(p)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="text-sm font-semibold truncate">{p.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                        {st && <span className={cn("text-[10px] px-1.5 py-0.5 rounded border truncate", st.pillCls)}>{st.label}</span>}
                        {p.project_manager && (
                          <span className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                            <User className="w-2.5 h-2.5" />{p.project_manager}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                  {isOpen && (
                    <ExpandedDetailsLeftRail project={p} spent={poTotals.get(p.id) ?? 0} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="relative" style={{ width: trackWidth }}>
            {/* Month header */}
            <div className="h-10 border-b border-border flex sticky top-0 z-10 bg-card">
              {months.map((m, i) => {
                const mEnd = nextMonth(m);
                const w = daysBetween(m, mEnd) * pxPerDay;
                return (
                  <div
                    key={i}
                    className="border-r border-border flex items-center px-2 text-[11px] font-semibold text-muted-foreground"
                    style={{ width: w }}
                  >
                    {MONTH_FMT.format(m)}
                  </div>
                );
              })}
            </div>

            {/* Today line */}
            {todayLeft >= 0 && todayLeft <= trackWidth && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{ left: todayLeft }}
              >
                {/* Dashed vertical line spanning full grid height */}
                <div
                  className="absolute top-10 bottom-0 w-0 border-l-2 border-dashed border-primary"
                  style={{ boxShadow: "0 0 8px hsl(var(--primary) / 0.35)" }}
                />
                {/* Pill label sitting in the month header */}
                <div className="absolute top-1 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold tracking-wide shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                  TODAY
                </div>
                {/* Top arrow indicator */}
                <div
                  className="absolute top-9 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: "6px solid hsl(var(--primary))",
                  }}
                />
              </div>
            )}

            {/* Rows */}
            {projects.map(p => (
              <div key={p.id}>
                <ProjectBar
                  project={p}
                  rangeStart={rangeStart}
                  pxPerDay={pxPerDay}
                  rowHeight={ROW_H}
                  onClick={() => onSelect(p)}
                />
                {expanded.has(p.id) && (
                  <ExpandedMilestonesRow
                    project={p}
                    rangeStart={rangeStart}
                    pxPerDay={pxPerDay}
                    trackWidth={trackWidth}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProjectBar({
  project, rangeStart, pxPerDay, rowHeight, onClick,
}: { project: Project; rangeStart: Date; pxPerDay: number; rowHeight: number; onClick: () => void }) {
  const { start, end } = projectRange(project);
  const left = ((start.getTime() - rangeStart.getTime()) / DAY) * pxPerDay;
  const width = Math.max(8, daysBetween(start, end) * pxPerDay);
  const st = PROJECT_STATUSES.find(s => s.key === project.status);
  const progress = Math.min(100, Math.max(0, Number(project.progress_pct ?? 0)));

  const today = new Date();
  const daysLeft = Math.round((end.getTime() - today.getTime()) / DAY);
  const completed = project.status === "completed";
  const onHold = project.status === "on_hold";
  const overdue = !completed && daysLeft < 0;
  const dueSoon = !completed && !overdue && daysLeft <= 7;

  return (
    <div className="relative border-b border-border hover:bg-muted/30" style={{ height: rowHeight }}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-md border-2 shadow-sm overflow-hidden",
          "transition-transform hover:scale-[1.01] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50",
          "bg-muted",
          completed && "border-emerald-500 ring-1 ring-emerald-500/30",
          overdue && "border-red-500 ring-1 ring-red-500/40 animate-pulse",
          dueSoon && "border-amber-500 ring-1 ring-amber-500/30",
          onHold && "border-slate-400 opacity-80",
          !completed && !overdue && !dueSoon && !onHold && "border-border/80",
        )}
        style={{ left, width, height: 28 }}
        title={`${project.name} · ${DATE_FMT.format(start)} → ${DATE_FMT.format(end)} · ${progress}%`}
      >
        <div className={cn("absolute inset-0 opacity-80", st?.color ?? "bg-slate-300")} />
        <div className="absolute inset-y-0 left-0 bg-foreground/25" style={{ width: `${progress}%` }} />
        <div className="relative z-10 flex items-center gap-1 h-full px-2 text-[11px] font-semibold text-foreground">
          {completed && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
          {onHold && <Pause className="w-3 h-3 text-slate-700" />}
          {overdue && <AlertTriangle className="w-3 h-3 text-red-700" />}
          <span className="truncate">{progress}%</span>
          {completed && (
            <span className="ml-auto inline-flex items-center gap-0.5 text-[9.5px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">
              <CheckCircle2 className="w-2.5 h-2.5" /> DONE
            </span>
          )}
          {overdue && (
            <span className="ml-auto inline-flex items-center gap-0.5 text-[9.5px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-full bg-red-600 text-white shadow-sm">
              <AlertTriangle className="w-2.5 h-2.5" /> {Math.abs(daysLeft)}d LATE
            </span>
          )}
          {dueSoon && (
            <span className="ml-auto inline-flex items-center gap-0.5 text-[9.5px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-sm">
              <Calendar className="w-2.5 h-2.5" /> {daysLeft}d LEFT
            </span>
          )}
          {onHold && (
            <span className="ml-auto inline-flex items-center gap-0.5 text-[9.5px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-full bg-slate-500 text-white shadow-sm">
              <Pause className="w-2.5 h-2.5" /> HOLD
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

/* ---------------- Expanded panels ---------------- */

function ExpandedDetailsLeftRail({ project, spent }: { project: Project; spent: number }) {
  const budget = Number(project.budget ?? 0);
  const overBudget = budget > 0 && spent > budget;
  return (
    <div className="px-3 py-2.5 bg-muted/30 border-t border-dashed border-border space-y-1.5 text-[11px]">
      {project.site_address && (
        <div className="flex items-start gap-1.5 text-muted-foreground">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="break-words">{project.site_address}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <IndianRupee className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className={overBudget ? "text-red-600 font-semibold" : "text-foreground"}>{formatINR(spent)}</span>
        <span className="text-muted-foreground">/ {formatINR(budget)}</span>
      </div>
      {project.project_type && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Target className="w-3 h-3 shrink-0" />
          <span className="capitalize">{project.project_type.replace(/_/g, " ")}</span>
        </div>
      )}
      {project.notes && (
        <div className="flex items-start gap-1.5 text-muted-foreground">
          <FileText className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2 break-words">{project.notes}</span>
        </div>
      )}
    </div>
  );
}

function ExpandedMilestonesRow({
  project, rangeStart, pxPerDay, trackWidth,
}: { project: Project; rangeStart: Date; pxPerDay: number; trackWidth: number }) {
  const { items, loading } = useMilestones(project.id);

  return (
    <div className="relative bg-muted/30 border-b border-dashed border-border" style={{ minHeight: 56, width: trackWidth }}>
      {loading && (
        <div className="absolute inset-0 flex items-center px-3 text-[11px] text-muted-foreground">Loading milestones…</div>
      )}
      {!loading && (!items || items.length === 0) && (
        <div className="absolute inset-0 flex items-center px-3 text-[11px] text-muted-foreground italic">No milestones yet</div>
      )}
      {!loading && items && items.map((m) => {
        const d = parseDate(m.target_date);
        if (!d) return null;
        const left = ((d.getTime() - rangeStart.getTime()) / DAY) * pxPerDay;
        const done = !!m.completed_at;
        return (
          <div
            key={m.id}
            className="absolute top-1/2 -translate-y-1/2 group"
            style={{ left }}
            title={`${m.title} · ${DATE_FMT.format(d)}${done ? " · completed" : ""}`}
          >
            <div className={cn(
              "w-3 h-3 rotate-45 border-2 -translate-x-1/2",
              done ? "bg-emerald-500 border-emerald-600" : "bg-card border-primary",
            )} />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-medium bg-card border border-border rounded px-1.5 py-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              {m.title} · {DATE_FMT.format(d)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Mobile stacked ---------------- */

function MobileStack({
  projects, poTotals, onSelect, expanded, onToggle, zoom, setZoom,
}: {
  projects: Project[]; poTotals: Map<string, number>; onSelect: (p: Project) => void;
  expanded: Set<string>; onToggle: (id: string) => void;
  zoom: Zoom; setZoom: (z: Zoom) => void;
}) {
  const today = new Date();
  // Centered window around today: week=±3.5d, month=±15d, quarter=±45d
  const WINDOW_DAYS: Record<Zoom, number> = { week: 7, month: 30, quarter: 90 };
  const windowDays = WINDOW_DAYS[zoom];
  const winStart = new Date(today.getTime() - (windowDays / 2) * DAY);
  const winEnd = new Date(today.getTime() + (windowDays / 2) * DAY);
  const todayPctInWindow = 50; // by construction

  return (
    <div className="space-y-2">
      {/* Zoom toolbar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground min-w-0">
          <Calendar className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {DATE_FMT.format(winStart)} — {DATE_FMT.format(winEnd)}
          </span>
        </div>
        <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 shadow-sm shrink-0">
          {ZOOM_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = zoom === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setZoom(opt.key)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1 h-7 px-2 rounded text-[10.5px] font-semibold transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background",
                )}
              >
                <Icon className="w-3 h-3" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {projects.map(p => {
        const { start, end } = projectRange(p);
        const total = daysBetween(start, end);
        const elapsed = Math.min(total, Math.max(0, daysBetween(start, today)));
        const elapsedPct = (elapsed / total) * 100;
        const progress = Math.min(100, Math.max(0, Number(p.progress_pct ?? 0)));
        const st = PROJECT_STATUSES.find(s => s.key === p.status);
        const daysLeft = Math.round((end.getTime() - today.getTime()) / DAY);
        const completed = p.status === "completed";
        const overdue = !completed && daysLeft < 0;
        const dueSoon = !completed && !overdue && daysLeft <= 7;
        const isOpen = expanded.has(p.id);
        const spent = poTotals.get(p.id) ?? 0;

        // Project bar position within the visible zoom window (clamped 0–100)
        const winSpan = winEnd.getTime() - winStart.getTime();
        const barLeftPct = Math.max(0, Math.min(100, ((start.getTime() - winStart.getTime()) / winSpan) * 100));
        const barRightPct = Math.max(0, Math.min(100, ((end.getTime() - winStart.getTime()) / winSpan) * 100));
        const barWidthPct = Math.max(1.5, barRightPct - barLeftPct);
        const inWindow = end >= winStart && start <= winEnd;

        return (
          <div key={p.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => onToggle(p.id)}
                  className="shrink-0 w-6 h-6 -ml-1 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                  aria-expanded={isOpen}
                >
                  <ChevronRight className={cn("w-4 h-4 transition-transform", isOpen && "rotate-90")} />
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  {p.project_manager && (
                    <p className="text-[11px] text-muted-foreground truncate">{p.project_manager}</p>
                  )}
                </button>
                {st && <Badge variant="outline" className={cn("text-[10px] shrink-0", st.pillCls)}>{st.label}</Badge>}
              </div>

              {/* Mini zoom-window timeline */}
              <div className="relative h-3 bg-muted/60 rounded-full overflow-hidden mb-1.5 border border-border/60">
                {/* Today marker */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-primary z-10"
                  style={{ left: `${todayPctInWindow}%` }}
                />
                {inWindow ? (
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-2 rounded-sm border",
                      completed && "bg-emerald-500 border-emerald-600",
                      overdue && "bg-red-500 border-red-600",
                      dueSoon && !overdue && "bg-amber-500 border-amber-600",
                      !completed && !overdue && !dueSoon && "bg-primary/70 border-primary",
                    )}
                    style={{ left: `${barLeftPct}%`, width: `${barWidthPct}%` }}
                    title={`${DATE_FMT.format(start)} → ${DATE_FMT.format(end)}`}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-muted-foreground italic">
                    Outside {zoom} window
                  </div>
                )}
              </div>

              {/* Progress vs elapsed bar (overall project) */}
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div className={cn("absolute inset-y-0 left-0 opacity-40", st?.color ?? "bg-slate-300")} style={{ width: `${elapsedPct}%` }} />
                <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${progress}%` }} />
              </div>

              <div className="flex items-center justify-between mt-1.5 text-[10.5px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {DATE_FMT.format(start)} → {DATE_FMT.format(end)}
                </span>
                <span className={cn(
                  "font-semibold",
                  completed && "text-emerald-700",
                  overdue && "text-red-700",
                  dueSoon && "text-amber-700",
                )}>
                  {completed ? "Done" : overdue ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d left`}
                </span>
              </div>
            </div>

            {isOpen && (
              <div className="px-3 pb-3 pt-2 border-t border-dashed border-border bg-muted/30 space-y-2 text-[11.5px]">
                {p.site_address && (
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="break-words">{p.site_address}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <IndianRupee className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="font-semibold">{formatINR(spent)}</span>
                  <span className="text-muted-foreground">/ {formatINR(Number(p.budget ?? 0))}</span>
                </div>
                {p.notes && (
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="break-words">{p.notes}</span>
                  </div>
                )}
                <MilestonesList projectId={p.id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MilestonesList({ projectId }: { projectId: string }) {
  const { items, loading } = useMilestones(projectId);
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Milestones</div>
      {loading && <p className="text-[11px] text-muted-foreground">Loading…</p>}
      {!loading && (!items || items.length === 0) && (
        <p className="text-[11px] text-muted-foreground italic">No milestones yet</p>
      )}
      {!loading && items && items.length > 0 && (
        <ul className="space-y-1">
          {items.map(m => {
            const done = !!m.completed_at;
            const d = parseDate(m.target_date);
            return (
              <li key={m.id} className="flex items-center gap-2 text-[11.5px]">
                <span className={cn(
                  "w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center",
                  done ? "bg-emerald-500 border-emerald-600" : "border-primary",
                )}>
                  {done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                </span>
                <span className={cn("flex-1 truncate", done && "line-through text-muted-foreground")}>{m.title}</span>
                {d && <span className="text-[10px] text-muted-foreground shrink-0">{DATE_FMT.format(d)}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
