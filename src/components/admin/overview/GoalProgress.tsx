import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, ArrowRight } from "lucide-react";
import { formatINR, formatINRFull } from "./utils";

interface Props {
  leadsThisMonth: number;
  revenueThisMonth: number;
  leadTarget: number;
  revenueTarget: number;
  onEdit?: () => void;
}

export function GoalProgress({ leadsThisMonth, revenueThisMonth, leadTarget, revenueTarget, onEdit }: Props) {
  const leadPct = leadTarget > 0 ? Math.min((leadsThisMonth / leadTarget) * 100, 100) : 0;
  const revPct = revenueTarget > 0 ? Math.min((revenueThisMonth / revenueTarget) * 100, 100) : 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Target className="h-4 w-4" /> Monthly Goals
        </h3>
        {onEdit && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
            Edit targets <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs font-medium text-foreground">Leads</span>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{leadsThisMonth}</span> of {leadTarget} ({leadPct.toFixed(0)}%)
            </span>
          </div>
          <Progress value={leadPct} className="h-2.5" />
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs font-medium text-foreground">Revenue</span>
            <span className="text-xs text-muted-foreground" title={formatINRFull(revenueThisMonth) + " of " + formatINRFull(revenueTarget)}>
              <span className="font-semibold text-foreground">{formatINR(revenueThisMonth)}</span> of {formatINR(revenueTarget)} ({revPct.toFixed(0)}%)
            </span>
          </div>
          <Progress value={revPct} className="h-2.5" />
        </div>
      </div>
    </Card>
  );
}
