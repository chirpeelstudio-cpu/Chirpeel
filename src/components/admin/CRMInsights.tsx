import { Badge } from "@/components/ui/badge";
import { STAGES } from "./constants";
import type { PipelineLead } from "./types";
import { Users, TrendingUp, Briefcase, IndianRupee, Clock, AlertTriangle } from "lucide-react";

interface Props {
  leads: PipelineLead[];
}

const CRMInsights = ({ leads }: Props) => {
  const total = leads.length;
  const completed = leads.filter(l => l.stage === "completed").length;
  const active = leads.filter(l => !["leads", "completed"].includes(l.stage)).length;
  const conversionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const totalRevenue = leads.reduce((sum, l) => {
    return sum + (l.payment_10_amount || 0) + (l.payment_50_amount || 0) + (l.payment_100_amount || 0);
  }, 0);

  const overdueFollowUps = leads.filter(l => l.next_followup_date && new Date(l.next_followup_date) < new Date()).length;
  const todayLeads = leads.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;

  const stageBreakdown = STAGES.map(s => ({
    ...s,
    count: leads.filter(l => l.stage === s.key).length,
  }));

  const sourceBreakdown = Object.entries(
    leads.reduce((acc, l) => { acc[l.source ?? "unknown"] = (acc[l.source ?? "unknown"] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Users, label: "Total Leads", value: total, color: "text-blue-600" },
          { icon: TrendingUp, label: "Conversion", value: `${conversionRate}%`, color: "text-green-600" },
          { icon: Briefcase, label: "Active Projects", value: active, color: "text-purple-600" },
          { icon: IndianRupee, label: "Revenue", value: `₹${(totalRevenue / 100000).toFixed(1)}L`, color: "text-amber-600" },
          { icon: Clock, label: "Today", value: todayLeads, color: "text-cyan-600" },
          { icon: AlertTriangle, label: "Overdue", value: overdueFollowUps, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Stage Breakdown */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">Pipeline Breakdown</h3>
        <div className="space-y-2">
          {stageBreakdown.map(s => (
            <div key={s.key} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              <span className="text-sm flex-1">{s.label}</span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div className={`h-2 rounded-full ${s.color} transition-all`} style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }} />
              </div>
              <span className="text-sm font-semibold w-8 text-right">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Source Breakdown */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">Lead Sources</h3>
        <div className="flex flex-wrap gap-2">
          {sourceBreakdown.map(([source, count]) => (
            <Badge key={source} variant="outline" className="text-xs py-1 px-3">
              {source.replace("_", " ")}: {count}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CRMInsights;
