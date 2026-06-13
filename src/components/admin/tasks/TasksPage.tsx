import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, ListChecks, User, Briefcase, ListFilter } from "lucide-react";
import { format, isPast, isToday, addDays } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TaskFiltersBar, TaskFiltersValue } from "./TaskFiltersBar";
import { TaskFormDialog } from "./TaskFormDialog";
import { TaskRecord, applyFilters, dueChipClass } from "./taskHelpers";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Inbox, Filter as FilterIcon, CalendarClock } from "lucide-react";

interface TaskWithLinks extends TaskRecord {
  lead?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithLinks[]>([]);
  const [team, setTeam] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [meIdent, setMeIdent] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFiltersValue>({ assignee: "any", due: "any", priority: "any", status: "open" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRecord | undefined>();
  const [view, setView] = useState<"list" | "board">("list");

  const loadMe = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
    setMeIdent(data?.full_name || data?.email || null);
  };

  const loadTeam = async () => {
    const { data } = await supabase.from("team_members").select("id, name").eq("active", true).order("name");
    setTeam((data ?? []) as any);
  };

  const fetchTasks = async () => {
    setLoading(true);
    const { data } = await (supabase.from("tasks" as any) as any)
      .select("id, title, due_at, completed_at, assigned_to, created_by, priority, lead_id, project_id, created_at")
      .order("completed_at", { ascending: true, nullsFirst: true })
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(500);
    const rows = (data ?? []) as TaskRecord[];
    // hydrate lead + project names
    const leadIds = Array.from(new Set(rows.map(r => r.lead_id).filter(Boolean))) as string[];
    const projectIds = Array.from(new Set(rows.map(r => r.project_id).filter(Boolean))) as string[];
    const [{ data: leadRows }, { data: projRows }] = await Promise.all([
      leadIds.length ? supabase.from("leads").select("id, name").in("id", leadIds) : Promise.resolve({ data: [] as any }),
      projectIds.length ? (supabase.from("projects" as any) as any).select("id, name").in("id", projectIds) : Promise.resolve({ data: [] as any }),
    ]);
    const leadMap = new Map((leadRows ?? []).map((l: any) => [l.id, l]));
    const projMap = new Map((projRows ?? []).map((p: any) => [p.id, p]));
    setTasks(rows.map(r => ({
      ...r,
      lead: r.lead_id ? ((leadMap.get(r.lead_id) ?? null) as TaskWithLinks["lead"]) : null,
      project: r.project_id ? ((projMap.get(r.project_id) ?? null) as TaskWithLinks["project"]) : null,
    })));
    setLoading(false);
  };

  useEffect(() => { loadMe(); loadTeam(); fetchTasks(); }, []);

  const filtered = useMemo(() => applyFilters(tasks, { ...filters, meIdent }) as TaskWithLinks[], [tasks, filters, meIdent]);

  const toggleDone = async (t: TaskRecord) => {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, completed_at: t.completed_at ? null : new Date().toISOString() } : x));
    const { error } = await supabase.from("tasks" as any).update({ completed_at: t.completed_at ? null : new Date().toISOString() } as any).eq("id", t.id);
    if (error) { toast.error(error.message); fetchTasks(); }
  };
  const removeTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else fetchTasks();
  };

  const counts = useMemo(() => {
    const open = tasks.filter(t => !t.completed_at);
    return {
      overdue: open.filter(t => t.due_at && isPast(new Date(t.due_at)) && !isToday(new Date(t.due_at))).length,
      today: open.filter(t => t.due_at && isToday(new Date(t.due_at))).length,
      mine: open.filter(t => t.assigned_to === meIdent).length,
      open: open.length,
    };
  }, [tasks, meIdent]);

  const renderRow = (t: TaskWithLinks) => (
    <Card key={t.id} className={cn("p-3 flex items-center gap-3", t.completed_at && "bg-muted/40 opacity-70")}>
      <Checkbox checked={!!t.completed_at} onCheckedChange={() => toggleDone(t)} />
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium truncate", t.completed_at && "line-through")}>{t.title}</div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {t.due_at && <span className={cn("text-xs", dueChipClass(t))}>{format(new Date(t.due_at), "MMM d, h:mm a")}</span>}
          {t.priority === "urgent" && <Badge variant="destructive" className="text-[10px] py-0">Urgent</Badge>}
          {t.priority === "high" && <Badge className="text-[10px] py-0 bg-amber-500 hover:bg-amber-500">High</Badge>}
          {t.priority === "low" && <Badge variant="secondary" className="text-[10px] py-0">Low</Badge>}
          {t.assigned_to ? (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><User className="w-3 h-3" />{t.assigned_to}</span>
          ) : <span className="text-xs text-muted-foreground italic">Unassigned</span>}
          {t.lead && <Badge variant="outline" className="text-[10px] py-0 gap-1"><User className="w-2.5 h-2.5" />Lead: {t.lead.name}</Badge>}
          {t.project && <Badge variant="outline" className="text-[10px] py-0 gap-1"><Briefcase className="w-2.5 h-2.5" />{t.project.name}</Badge>}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { setEditing(t); setDialogOpen(true); }}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleDone(t)}>{t.completed_at ? "Mark open" : "Mark complete"}</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => removeTask(t.id)}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );

  const TaskSkeleton = () => (
    <Card className="p-3 flex items-center gap-3">
      <Skeleton className="w-4 h-4 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-8 w-8 rounded" />
    </Card>
  );

  const hasAnyTasks = tasks.length > 0;
  const hasActiveFilters =
    filters.assignee !== "any" || filters.due !== "any" || filters.priority !== "any" || filters.status !== "open";

  const ListEmpty = () => (
    <Card className="p-10 flex flex-col items-center text-center">
      {hasAnyTasks ? (
        <>
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <FilterIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No tasks match these filters</p>
          <p className="text-xs text-muted-foreground mt-1">Try clearing a filter or switching status to All.</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setFilters({ assignee: "any", due: "any", priority: "any", status: "open" })}>
              Clear filters
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Inbox className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-medium">No tasks yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Create your first task to track follow-ups, calls, and deliverables. You can also ask the AI to create one.
          </p>
          <Button size="sm" className="mt-4" onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" />New task
          </Button>
        </>
      )}
    </Card>
  );

  // Board buckets (use filters but ignore status filter)
  const boardSource = useMemo(() => applyFilters(tasks, { ...filters, status: "all", meIdent }) as TaskWithLinks[], [tasks, filters, meIdent]);
  const todo = boardSource.filter(t => !t.completed_at && (!t.due_at || new Date(t.due_at) >= addDays(new Date(), 2)));
  const dueSoon = boardSource.filter(t => !t.completed_at && t.due_at && new Date(t.due_at) < addDays(new Date(), 2));
  const recentDone = boardSource.filter(t => t.completed_at && new Date(t.completed_at) >= addDays(new Date(), -7));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ListChecks className="w-6 h-6 text-primary" />Tasks</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {counts.open} open · {counts.overdue} overdue · {counts.today} due today · {counts.mine} assigned to you
          </p>
        </div>
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" />New task</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ListFilter className="w-4 h-4 text-muted-foreground" />
        <TaskFiltersBar value={filters} onChange={setFilters} team={team} />
      </div>

      <Tabs value={view} onValueChange={v => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-3 space-y-2">
          {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <TaskSkeleton key={i} />)}
              </div>
            )
            : filtered.length === 0 ? <ListEmpty />
            : filtered.map(renderRow)}
        </TabsContent>
        <TabsContent value="board" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: "To Do", items: todo, accent: "border-t-blue-500", icon: Inbox, emptyText: "Nothing queued" },
              { title: "Due Soon", items: dueSoon, accent: "border-t-amber-500", icon: CalendarClock, emptyText: "All clear" },
              { title: "Completed (7d)", items: recentDone, accent: "border-t-emerald-500", icon: CheckCircle2, emptyText: "Nothing completed" },
            ].map(col => (
              <div key={col.title} className={cn("rounded-lg border bg-muted/30 border-t-4 p-2 space-y-2", col.accent)}>
                <div className="text-xs font-semibold px-1 flex justify-between">
                  <span>{col.title}</span><span className="text-muted-foreground">{col.items.length}</span>
                </div>
                {loading
                  ? <><TaskSkeleton /><TaskSkeleton /></>
                  : col.items.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <col.icon className="w-5 h-5 text-muted-foreground/60 mb-1.5" />
                      <p className="text-xs text-muted-foreground">{col.emptyText}</p>
                    </div>
                  )
                  : col.items.map(renderRow)}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        team={team}
        meIdent={meIdent}
        initial={editing}
        onSaved={fetchTasks}
      />
    </div>
  );
}