import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ListChecks, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Task {
  id: string; title: string; due_at: string | null; completed_at: string | null; priority: string; lead_id: string | null;
}

export default function MyTasksCard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [me, setMe] = useState<string | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
    const ident = profile?.full_name || profile?.email || null;
    setMe(ident);
    if (!ident) return;
    const { data } = await supabase.from("tasks" as any)
      .select("id, title, due_at, completed_at, priority, lead_id")
      .or(`assigned_to.eq.${ident},created_by.eq.${ident}`)
      .is("completed_at", null)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(8);
    setTasks((data ?? []) as unknown as Task[]);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (t: Task) => {
    const { error } = await supabase.from("tasks" as any).update({ completed_at: new Date().toISOString() } as any).eq("id", t.id);
    if (error) toast.error(error.message); else { toast.success("Task completed"); load(); }
  };

  const overdueCount = tasks.filter(t => t.due_at && isPast(new Date(t.due_at)) && !isToday(new Date(t.due_at))).length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary" /> My Tasks</h3>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />{overdueCount} overdue</Badge>
        )}
      </div>
      {!me ? (
        <p className="text-xs text-muted-foreground">Sign-in required.</p>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">All caught up! 🎉</p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(t => {
            const due = t.due_at ? new Date(t.due_at) : null;
            const overdue = due && isPast(due) && !isToday(due);
            return (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                <Checkbox onCheckedChange={() => toggle(t)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{t.title}</p>
                  {due && <p className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>{format(due, "MMM d, h:mm a")}</p>}
                </div>
                {t.priority === "high" && <Badge variant="destructive" className="text-[10px]">High</Badge>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
