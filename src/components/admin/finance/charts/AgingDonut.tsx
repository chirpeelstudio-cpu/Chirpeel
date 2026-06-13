import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { Invoice } from "../types";
import { formatINR } from "../types";
import { ageBucket } from "../finance-utils";

interface Props {
  invoices: Invoice[];
}

const COLORS: Record<string, string> = {
  current: "hsl(217 91% 60%)",
  "0-30": "hsl(43 96% 56%)",
  "31-60": "hsl(25 95% 53%)",
  "60+": "hsl(0 84% 60%)",
};

const LABELS: Record<string, string> = {
  current: "Current",
  "0-30": "0–30 days",
  "31-60": "31–60 days",
  "60+": "60+ days",
};

export function AgingDonut({ invoices }: Props) {
  const { data, total } = useMemo(() => {
    const buckets: Record<string, number> = { current: 0, "0-30": 0, "31-60": 0, "60+": 0 };
    invoices.forEach(i => {
      const out = Number(i.total_amount) - Number(i.paid_amount);
      if (out <= 0) return;
      buckets[ageBucket(i.due_date)] += out;
    });
    const arr = Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: LABELS[k], key: k, value: v }));
    return { data: arr, total: Object.values(buckets).reduce((a, b) => a + b, 0) };
  }, [invoices]);

  return (
    <Card className="p-3 sm:p-4">
      <h3 className="text-sm font-semibold mb-2">Aging Breakdown</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">All caught up — nothing outstanding</p>
      ) : (
        <div className="relative h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.map(d => <Cell key={d.key} fill={COLORS[d.key]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid hsl(var(--border))" }}
                formatter={(value: number) => formatINR(value)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[11px] text-muted-foreground">Outstanding</div>
            <div className="text-base font-bold">{formatINR(total)}</div>
          </div>
        </div>
      )}
      {data.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 mt-2 text-xs">
          {data.map(d => (
            <div key={d.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[d.key] }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="ml-auto font-medium">{formatINR(d.value)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
