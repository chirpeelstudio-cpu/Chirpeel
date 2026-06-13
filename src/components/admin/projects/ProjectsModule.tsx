import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GanttChartSquare, Table as TableIcon, Plus, Briefcase, Clock, CheckCircle2, IndianRupee } from "lucide-react";
import { ProjectsTimeline } from "./ProjectsTimeline";
import { ProjectsTable } from "./ProjectsTable";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectDetailDrawer } from "./ProjectDetailDrawer";
import { PROJECT_STATUSES, type Project } from "./types";
import UpgradeGate from "@/components/billing/UpgradeGate";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export default function ProjectsModule() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [poTotalsByProject, setPoTotalsByProject] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pr, po] = await Promise.all([
      supabase.from("projects" as any).select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("purchase_orders" as any).select("project_id, total_amount").is("deleted_at", null),
    ]);
    setProjects((pr.data ?? []) as unknown as Project[]);
    const m = new Map<string, number>();
    ((po.data ?? []) as any[]).forEach((p) => {
      if (p.project_id) m.set(p.project_id, (m.get(p.project_id) ?? 0) + Number(p.total_amount ?? 0));
    });
    setPoTotalsByProject(m);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (projects.length > 0 && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const projectId = params.get("projectId");
      if (projectId) {
        const proj = projects.find(p => p.id === projectId);
        if (proj) {
          setSelected(proj);
          const url = new URL(window.location.href);
          url.searchParams.delete("projectId");
          window.history.replaceState(null, "", url.toString());
        }
      }
    }
  }, [projects]);

  // Listen for FAB-triggered "Add" event from AdminDashboard
  useEffect(() => {
    const onAdd = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.view === "projects") { setEditing(null); setDialogOpen(true); }
    };
    window.addEventListener("admin:add", onAdd);
    return () => window.removeEventListener("admin:add", onAdd);
  }, []);

  const totalBudget = projects.reduce((s, p) => s + Number(p.budget ?? 0), 0);
  const totalSpent = Array.from(poTotalsByProject.values()).reduce((s, v) => s + v, 0);
  const active = projects.filter(p => !["completed","on_hold"].includes(p.status)).length;
  const done = projects.filter(p => p.status === "completed").length;

  const onSelect = (p: Project) => setSelected(p);
  const onEdit = (p: Project) => { setSelected(null); setEditing(p); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Briefcase}    label="All Projects"  value={projects.length} />
        <KPI icon={Clock}         label="Active"       value={active} tone="blue" />
        <KPI icon={CheckCircle2}  label="Completed"    value={done} tone="emerald" />
        <KPI icon={IndianRupee}   label="Spent / Budget" value={`${formatINR(totalSpent)} / ${formatINR(totalBudget)}`} tone="amber" />
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="-mx-1 overflow-x-auto scrollbar-none flex-1 min-w-0">
            <TabsList data-tour-id="projects-tabs" className="inline-flex w-max">
              <TabsTrigger value="timeline" className="flex items-center gap-1.5"><GanttChartSquare className="w-4 h-4" /> Timeline</TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-1.5"><TableIcon className="w-4 h-4" /> Table</TabsTrigger>
            </TabsList>
          </div>
          <UpgradeGate kind="project">
            <Button data-tour-id="projects-add" onClick={() => { setEditing(null); setDialogOpen(true); }} size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> New Project
            </Button>
          </UpgradeGate>
        </div>

        <TabsContent value="timeline">
          <ProjectsTimeline
            projects={projects}
            poTotals={poTotalsByProject}
            loading={loading}
            onSelect={onSelect}
            onRefresh={fetchAll}
            onAdd={() => { setEditing(null); setDialogOpen(true); }}
          />
        </TabsContent>
        <TabsContent value="table">
          <ProjectsTable
            projects={projects}
            poTotals={poTotalsByProject}
            loading={loading}
            onSelect={onSelect}
            onRefresh={fetchAll}
            onAdd={() => { setEditing(null); setDialogOpen(true); }}
          />
        </TabsContent>
      </Tabs>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editing}
        onSaved={() => { setDialogOpen(false); fetchAll(); }}
      />

      <ProjectDetailDrawer
        project={selected}
        spent={selected ? poTotalsByProject.get(selected.id) ?? 0 : 0}
        onClose={() => setSelected(null)}
        onEdit={onEdit}
        onRefresh={fetchAll}
      />
    </div>
  );
}

function KPI({ icon: Icon, label, value, tone = "primary" }: { icon: any; label: string; value: any; tone?: string }) {
  const toneCls: Record<string,string> = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-700 bg-emerald-100",
    blue:    "text-blue-700 bg-blue-100",
    amber:   "text-amber-700 bg-amber-100",
  };
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${toneCls[tone] ?? toneCls.primary}`}><Icon className="w-4 h-4" /></div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-base font-semibold truncate">{value}</p>
      </div>
    </Card>
  );
}
