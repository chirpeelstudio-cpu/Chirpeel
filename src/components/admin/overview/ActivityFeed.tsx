import { Card } from "@/components/ui/card";
import { UserPlus, FileText, IndianRupee } from "lucide-react";
import { formatINR } from "./utils";

export interface ActivityEvent {
  type: "lead" | "quotation" | "payment";
  title: string;
  sub: string;
  amount?: number;
  at: string; // ISO
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ICONS = {
  lead: { icon: UserPlus, cls: "bg-blue-50 text-blue-600 border-blue-200" },
  quotation: { icon: FileText, cls: "bg-amber-50 text-amber-600 border-amber-200" },
  payment: { icon: IndianRupee, cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <Card className="p-4 h-full">
      <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
      ) : (
        <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {events.map((e, i) => {
            const cfg = ICONS[e.type];
            const Icon = cfg.icon;
            return (
              <li key={i} className="flex items-start gap-3">
                <div className={`rounded-md p-1.5 border shrink-0 ${cfg.cls}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {e.sub}{e.amount ? ` · ${formatINR(e.amount)}` : ""}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-1">{timeAgo(e.at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
