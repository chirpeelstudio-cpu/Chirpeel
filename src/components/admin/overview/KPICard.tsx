import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KPIDelta {
  value: number;
  direction: "up" | "down" | "flat";
  positiveIsGood?: boolean; // default true
  label?: string; // e.g. "vs last 30d"
}

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "purple" | "slate";
  onClick?: () => void;
  delta?: KPIDelta;
}

const TONE: Record<NonNullable<KPICardProps["tone"]>, string> = {
  blue:   "bg-blue-50 text-blue-700 border-blue-200",
  green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber:  "bg-amber-50 text-amber-700 border-amber-200",
  red:    "bg-red-50 text-red-700 border-red-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  slate:  "bg-slate-50 text-slate-700 border-slate-200",
};

export function KPICard({ label, value, sub, icon: Icon, tone = "slate", onClick, delta }: KPICardProps) {
  const positiveIsGood = delta?.positiveIsGood ?? true;
  const isGood = !delta || delta.direction === "flat"
    ? null
    : (delta.direction === "up" ? positiveIsGood : !positiveIsGood);
  const deltaCls = isGood === null ? "text-muted-foreground" : isGood ? "text-emerald-600" : "text-red-600";
  const arrow = delta?.direction === "up" ? "▲" : delta?.direction === "down" ? "▼" : "■";

  return (
    <Card
      onClick={onClick}
      className={cn("p-4 transition-shadow", onClick && "cursor-pointer hover:shadow-md")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 leading-tight">{value}</p>
          {delta && (
            <p className={cn("text-[11px] mt-0.5 truncate", deltaCls)}>
              {arrow} {Math.abs(delta.value).toFixed(0)}% {delta.label ?? "vs prev"}
            </p>
          )}
          {sub && <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn("rounded-md p-2 border shrink-0", TONE[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </Card>
  );
}
