import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import type { Expense } from "../types";
import { formatINR } from "../types";

interface Props {
  expenses: Expense[];
}

const COLORS: Record<string, string> = {
  material: "hsl(217 91% 60%)",
  labour: "hsl(280 84% 60%)",
  transport: "hsl(43 96% 56%)",
  overhead: "hsl(25 95% 53%)",
  other: "hsl(220 14% 60%)",
};

export function ExpenseCategoryBar({ expenses }: Props) {
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  if (data.length === 0) {
    return (
      <Card className="p-3 sm:p-4">
        <h3 className="text-sm font-semibold mb-2">Expenses by Category</h3>
        <p className="text-sm text-muted-foreground text-center py-8">No expenses to chart</p>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4">
      <h3 className="text-sm font-semibold mb-3">Expenses by Category</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid hsl(var(--border))" }} formatter={(value: number) => formatINR(value)} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map(d => <Cell key={d.name} fill={COLORS[d.name] || "hsl(220 14% 60%)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
