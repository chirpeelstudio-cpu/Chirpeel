import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, User, ListFilter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TaskFiltersBar, TaskFiltersValue } from "../tasks/TaskFiltersBar";
import { TaskFormDialog } from "../tasks/TaskFormDialog";
import { TaskRecord, applyFilters, dueChipClass } from "../tasks/taskHelpers";

interface Props { projectId: string }

export function ProjectTasks({ projectId }: Props) {
  const [tasks, setTasks] = useState<(TaskRecord & { lead?: { id: string; name: string } | null })[]>([]);
  const [team, setTeam] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [meIdent, setMeIdent] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFiltersValue>({ assignee: "any", due: "any", priority: "any", status: "open" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRecord | undefined>();

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await (supabase.from("tasks" as any) as any)
      .select("id, title, due_at, completed_at, assigned_to, created_by, priority, lead_id, project_id, created_at")
      .eq("project_id", projectId)
      .order("completed_at", { ascending: true, nullsFirst: true })
      .order("due_at", { ascending: true, nullsFirst: false });
    const rows = (data ?? []) as TaskRecord[];
    const leadIds = Array.from(new Set(rows.map(r => r.lead_id).filter(Boolean))) as string[];
    const { data: leadRows } = leadIds.length
      ? await supabase.from("leads").select("id, name").in("id", leadIds)
      : { data: [] as any };
    const leadMap = new Map((leadRows ?? []).map((l: any) => [l.id, l]));
    setTasks(rows.map(r => ({ ...r, lead: r.lead_id ? (leadMap.get(r.lead_id) as any) ?? null : null })));
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    (async () => {
      const { data } = await supabase.from("team_members").select("id, name").eq("active", true).order("name");
      setTeam((data ?? []) as any);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
        setMeIdent(p?.full_name || p?.email || null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const filtered = useMemo(() => applyFilters(tasks, { ...filters, meIdent }), [tasks, filters, meIdent]);

  const toggle = async (t: TaskRecord) => {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, completed_at: t.completed_at ? null : new Date().toISOString() } : x));
    const { error } = await supabase.from("tasks" as any).update({ completed_at: t.completed_at ? null : new Date().toISOString() } as any).eq("id", t.id);
    if (error) { toast.error(error.message); fetchAll(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else fetchAll();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListFilter className="w-4 h-4" />
          <TaskFiltersBar value={filters} onChange={setFilters} team={team} />
        </div>
        <Button size="sm" onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" />New task
        </Button>
      </div>

      {loading ? <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        : filtered.length === 0 ? <Card className="p-6 text-center text-xs text-muted-foreground">No tasks match these filters.</Card>
        : (
          <div className="space-y-1.5">
            {filtered.map(t => (
              <Card key={t.id} className={cn("p-2.5 flex items-center gap-2", t.completed_at && "bg-muted/40 opacity-70")}>
                <Checkbox checked={!!t.completed_at} onCheckedChange={() => toggle(t)} />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-medium truncate", t.completed_at && "line-through")}>{t.title}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {t.due_at && <span className={cn("text-xs", dueChipClass(t))}>{format(new Date(t.due_at), "MMM d, h:mm a")}</span>}
                    {t.priority === "urgent" && <Badge variant="destructive" className="text-[10px] py-0">Urgent</Badge>}
                    {t.priority === "high" && <Badge className="text-[10px] py-0 bg-amber-500 hover:bg-amber-500">High</Badge>}
                    {t.priority === "low" && <Badge variant="secondary" className="text-[10px] py-0">Low</Badge>}
                    {t.assigned_to ? (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><User className="w-3 h-3" />{t.assigned_to}</span>
                    ) : <span className="text-xs text-muted-foreground italic">Unassigned</span>}
                    {(t as any).lead && <Badge variant="outline" className="text-[10px] py-0">Lead: {(t as any).lead.name}</Badge>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditing(t); setDialogOpen(true); }}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggle(t)}>{t.completed_at ? "Mark open" : "Mark complete"}</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => remove(t.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}
          </div>
        )}

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        team={team}
        meIdent={meIdent}
        initial={editing}
        fixedProjectId={projectId}
        onSaved={fetchAll}
      />
    </div>
  );
}