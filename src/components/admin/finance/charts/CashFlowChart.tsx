import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import type { Payment, Expense } from "../types";
import { formatINR } from "../types";

interface Props {
  payments: Payment[];
  expenses: Expense[];
  weeks?: number;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay() || 7;
  x.setDate(x.getDate() - (day - 1));
  return x;
}

function weekKey(d: Date) {
  return startOfWeek(d).toISOString().slice(0, 10);
}

function weekLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function CashFlowChart({ payments, expenses, weeks = 12 }: Props) {
  const data = useMemo(() => {
    const today = startOfWeek(new Date());
    const buckets: Record<string, { label: string; collected: number; spent: number; net: number }> = {};
    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i * 7);
      const k = weekKey(d);
      buckets[k] = { label: weekLabel(k), collected: 0, spent: 0, net: 0 };
    }
    payments.forEach(p => {
      const k = weekKey(new Date(p.paid_on));
      if (buckets[k]) buckets[k].collected += Number(p.amount);
    });
    expenses.forEach(e => {
      const k = weekKey(new Date(e.expense_date));
      if (buckets[k]) buckets[k].spent += Number(e.amount);
    });
    return Object.values(buckets).map(b => ({ ...b, net: b.collected - b.spent }));
  }, [payments, expenses, weeks]);

  return (
    <Card className="p-3 sm:p-4">
      <h3 className="text-sm font-semibold mb-3">Cash Flow · Last {weeks} weeks</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid hsl(var(--border))" }}
              formatter={(value: number) => formatINR(value)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="collected" name="Collections" fill="hsl(160 84% 39%)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="spent" name="Expenses" fill="hsl(25 95% 53%)" radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="net" name="Net" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
