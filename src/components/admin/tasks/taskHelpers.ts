import { isPast, isToday, addDays, startOfDay, endOfDay, endOfWeek } from "date-fns";

export type TaskStatusFilter = "open" | "completed" | "all";
export type DueFilter = "any" | "overdue" | "today" | "week" | "none";
export type PriorityFilter = "any" | "low" | "normal" | "high" | "urgent";

export interface TaskRecord {
  id: string;
  title: string;
  due_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  priority: string;
  lead_id: string | null;
  project_id: string | null;
  created_at?: string;
}

export function applyFilters(
  tasks: TaskRecord[],
  f: { assignee: string; due: DueFilter; priority: PriorityFilter; status: TaskStatusFilter; meIdent?: string | null }
): TaskRecord[] {
  return tasks.filter(t => {
    // status
    if (f.status === "open" && t.completed_at) return false;
    if (f.status === "completed" && !t.completed_at) return false;
    // assignee
    if (f.assignee === "__me" && t.assigned_to !== f.meIdent) return false;
    else if (f.assignee === "__unassigned" && t.assigned_to) return false;
    else if (f.assignee !== "any" && f.assignee !== "__me" && f.assignee !== "__unassigned" && t.assigned_to !== f.assignee) return false;
    // priority
    if (f.priority !== "any" && t.priority !== f.priority) return false;
    // due
    if (f.due !== "any") {
      const due = t.due_at ? new Date(t.due_at) : null;
      if (f.due === "none") { if (due) return false; }
      else if (!due) return false;
      else if (f.due === "overdue") { if (!(isPast(due) && !isToday(due))) return false; }
      else if (f.due === "today") { if (!isToday(due)) return false; }
      else if (f.due === "week") {
        const end = endOfWeek(new Date(), { weekStartsOn: 1 });
        if (due < startOfDay(new Date()) || due > endOfDay(end)) return false;
      }
    }
    return true;
  });
}

export function dueChipClass(t: TaskRecord) {
  if (!t.due_at || t.completed_at) return "text-muted-foreground";
  const d = new Date(t.due_at);
  if (isPast(d) && !isToday(d)) return "text-destructive font-medium";
  if (isToday(d)) return "text-amber-600 font-medium";
  if (d < addDays(new Date(), 3)) return "text-amber-700";
  return "text-muted-foreground";
}

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];