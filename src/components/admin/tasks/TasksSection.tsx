import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, Trash2, ListChecks, CalendarCheck, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  due_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  priority: string;
  lead_id: string | null;
  google_event_id?: string | null;
  calendar_html_link?: string | null;
  calendar_synced_at?: string | null;
}

interface Props {
  leadId?: string;
  assigneeDefault?: string | null;
}

export default function TasksSection({ leadId, assigneeDefault }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState<Date | undefined>();
  const [priority, setPriority] = useState("normal");
  const [creator, setCreator] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
        setCreator(data?.full_name || data?.email || null);
      }
    })();
  }, []);

  const fetchTasks = async () => {
    if (!leadId) return;
    const { data } = await supabase.from("tasks" as any).select("*").eq("lead_id", leadId).order("completed_at", { ascending: true, nullsFirst: true }).order("due_at", { ascending: true });
    setTasks((data ?? []) as unknown as Task[]);
  };

  useEffect(() => { if (leadId) fetchTasks(); /* eslint-disable-next-line */ }, [leadId]);

  const addTask = async () => {
    if (!title.trim() || !leadId) return;
    const { error } = await supabase.from("tasks" as any).insert({
      title: title.trim(),
      lead_id: leadId,
      assigned_to: assigneeDefault || creator,
      created_by: creator,
      due_at: dueAt ? dueAt.toISOString() : null,
      priority,
    } as any);
    if (error) { toast.error(error.message); return; }
    setTitle(""); setDueAt(undefined); setPriority("normal");
    fetchTasks();
  };

  const toggleDone = async (t: Task) => {
    const { error } = await supabase.from("tasks" as any)
      .update({ completed_at: t.completed_at ? null : new Date().toISOString() } as any)
      .eq("id", t.id);
    if (error) toast.error(error.message); else fetchTasks();
  };

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const syncToCalendar = async (t: Task, action: "upsert" | "delete" = "upsert") => {
    if (action === "upsert" && !t.due_at) {
      toast.error("Set a due date before syncing to Calendar.");
      return;
    }
    setSyncingId(t.id);
    const { data, error } = await supabase.functions.invoke("sync-task-to-calendar", {
      body: { task_id: t.id, action },
    });
    setSyncingId(null);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Calendar sync failed");
      return;
    }
    if (action === "delete") toast.success("Removed from Google Calendar");
    else if (data.adjusted) toast.success("Synced — shifted into working hours");
    else toast.success("Synced to Google Calendar");
    fetchTasks();
  };

  const removeTask = async (id: string) => {
    const { error } = await supabase.from("tasks" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else fetchTasks();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ListChecks className="w-4 h-4 text-primary" /> Tasks
      </div>

      <div className="flex flex-wrap gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task (e.g. Call client)" className="flex-1 min-w-[200px]" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              {dueAt ? format(dueAt, "MMM d") : "Due date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueAt} onSelect={setDueAt} /></PopoverContent>
        </Popover>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={addTask} size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button>
      </div>

      <div className="space-y-1.5">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No tasks yet.</p>
        ) : tasks.map(t => {
          const due = t.due_at ? new Date(t.due_at) : null;
          const overdue = !t.completed_at && due && isPast(due) && !isToday(due);
          const dueToday = !t.completed_at && due && isToday(due);
          return (
            <div key={t.id} className={cn("flex items-center gap-2 p-2 rounded border", t.completed_at ? "bg-muted/40 opacity-60" : "bg-card")}>
              <Checkbox checked={!!t.completed_at} onCheckedChange={() => toggleDone(t)} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm", t.completed_at && "line-through")}>{t.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {due && (
                    <span className={cn("text-xs", overdue ? "text-destructive font-medium" : dueToday ? "text-amber-600 font-medium" : "text-muted-foreground")}>
                      {format(due, "MMM d")}
                    </span>
                  )}
                  {t.priority === "high" && <Badge variant="destructive" className="text-[10px] py-0">High</Badge>}
                  {t.priority === "low" && <Badge variant="secondary" className="text-[10px] py-0">Low</Badge>}
                  {t.assigned_to && <span className="text-xs text-muted-foreground">@ {t.assigned_to}</span>}
                  {t.google_event_id && (
                    <a href={t.calendar_html_link ?? "#"} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline">
                      on Calendar
                    </a>
                  )}
                </div>
              </div>
              {!t.completed_at && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title={t.google_event_id ? "Update Google Calendar event" : "Sync to Google Calendar"}
                  disabled={syncingId === t.id || !t.due_at}
                  onClick={() => syncToCalendar(t, "upsert")}
                >
                  {syncingId === t.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <CalendarCheck className={cn("w-3.5 h-3.5", t.google_event_id ? "text-primary" : "text-muted-foreground")} />}
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => {
                if (t.google_event_id) await syncToCalendar(t, "delete");
                removeTask(t.id);
              }}>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
