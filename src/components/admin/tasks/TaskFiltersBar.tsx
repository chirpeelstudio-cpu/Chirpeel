import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, User2, CalendarClock, Flag, CircleDot, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskStatusFilter, DueFilter, PriorityFilter } from "./taskHelpers";

export interface TaskFiltersValue {
  assignee: string;
  due: DueFilter;
  priority: PriorityFilter;
  status: TaskStatusFilter;
}

interface Props {
  value: TaskFiltersValue;
  onChange: (v: TaskFiltersValue) => void;
  team: { id: string; name: string }[];
  hideAssignee?: boolean;
}

const DUE_OPTS: { v: DueFilter; label: string }[] = [
  { v: "any", label: "Any due date" },
  { v: "overdue", label: "Overdue" },
  { v: "today", label: "Today" },
  { v: "week", label: "This week" },
  { v: "none", label: "No date" },
];
const PRIO_OPTS: { v: PriorityFilter; label: string; dot?: string }[] = [
  { v: "any", label: "Any priority" },
  { v: "urgent", label: "Urgent", dot: "bg-destructive" },
  { v: "high", label: "High", dot: "bg-amber-500" },
  { v: "normal", label: "Normal", dot: "bg-muted-foreground" },
  { v: "low", label: "Low", dot: "bg-muted-foreground/60" },
];
const STATUS_OPTS: { v: TaskStatusFilter; label: string }[] = [
  { v: "open", label: "Open" },
  { v: "completed", label: "Completed" },
  { v: "all", label: "All" },
];

function Chip({
  icon: Icon, label, value, active, onClear, children,
}: { icon: any; label: string; value: string; active: boolean; onClear?: () => void; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 rounded-full px-3 text-xs gap-1.5 border-dashed transition-colors",
            active && "border-solid border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="font-medium">{label}</span>
          {active && <span className="text-foreground/80">· {value}</span>}
          {active && onClear ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClear(); }}
              className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5"
              aria-label={`Clear ${label}`}
            >
              <X className="w-3 h-3" />
            </span>
          ) : <ChevronDown className="w-3 h-3 opacity-60" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function Row({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent text-left",
        active && "bg-accent"
      )}
    >
      <span className="flex items-center gap-2 min-w-0 truncate">{children}</span>
      {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
    </button>
  );
}

export function TaskFiltersBar({ value, onChange, team, hideAssignee }: Props) {
  const set = <K extends keyof TaskFiltersValue>(k: K, v: TaskFiltersValue[K]) =>
    onChange({ ...value, [k]: v });

  const assigneeLabel = value.assignee === "any" ? "" :
    value.assignee === "__me" ? "Me" :
    value.assignee === "__unassigned" ? "Unassigned" : value.assignee;
  const dueLabel = value.due === "any" ? "" : DUE_OPTS.find(o => o.v === value.due)?.label ?? "";
  const prioLabel = value.priority === "any" ? "" : PRIO_OPTS.find(o => o.v === value.priority)?.label ?? "";
  const statusLabel = STATUS_OPTS.find(o => o.v === value.status)?.label ?? "";

  const activeCount =
    (value.assignee !== "any" ? 1 : 0) +
    (value.due !== "any" ? 1 : 0) +
    (value.priority !== "any" ? 1 : 0) +
    (value.status !== "open" ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {!hideAssignee && (
        <Chip
          icon={User2}
          label="Assignee"
          value={assigneeLabel}
          active={value.assignee !== "any"}
          onClear={() => set("assignee", "any")}
        >
          <Row active={value.assignee === "any"} onClick={() => set("assignee", "any")}>All assignees</Row>
          <Row active={value.assignee === "__me"} onClick={() => set("assignee", "__me")}>
            <User2 className="w-3.5 h-3.5" /> Me
          </Row>
          <Row active={value.assignee === "__unassigned"} onClick={() => set("assignee", "__unassigned")}>
            <span className="italic text-muted-foreground">Unassigned</span>
          </Row>
          {team.length > 0 && <div className="my-1 h-px bg-border" />}
          <div className="max-h-48 overflow-y-auto">
            {team.map(m => (
              <Row key={m.id} active={value.assignee === m.name} onClick={() => set("assignee", m.name)}>{m.name}</Row>
            ))}
          </div>
        </Chip>
      )}
      <Chip icon={CalendarClock} label="Due" value={dueLabel} active={value.due !== "any"} onClear={() => set("due", "any")}>
        {DUE_OPTS.map(o => (
          <Row key={o.v} active={value.due === o.v} onClick={() => set("due", o.v)}>{o.label}</Row>
        ))}
      </Chip>
      <Chip icon={Flag} label="Priority" value={prioLabel} active={value.priority !== "any"} onClear={() => set("priority", "any")}>
        {PRIO_OPTS.map(o => (
          <Row key={o.v} active={value.priority === o.v} onClick={() => set("priority", o.v)}>
            {o.dot && <span className={cn("w-2 h-2 rounded-full", o.dot)} />}
            {o.label}
          </Row>
        ))}
      </Chip>
      <Chip icon={CircleDot} label="Status" value={statusLabel} active={value.status !== "open"} onClear={() => set("status", "open")}>
        {STATUS_OPTS.map(o => (
          <Row key={o.v} active={value.status === o.v} onClick={() => set("status", o.v)}>{o.label}</Row>
        ))}
      </Chip>
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange({ assignee: "any", due: "any", priority: "any", status: "open" })}
        >
          <X className="w-3 h-3 mr-1" />
          Clear
          <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{activeCount}</Badge>
        </Button>
      )}
    </div>
  );
}