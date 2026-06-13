import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatINR } from "./types";
import type { Invoice, Payment, Expense } from "./types";
import { CashFlowChart } from "./charts/CashFlowChart";

interface Props {
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
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

export function CashFlowTab({ invoices, payments, expenses }: Props) {
  // Forecast: next 8 weeks of expected collections from issued/overdue invoices grouped by due_date week
  const forecast = useMemo(() => {
    const today = startOfWeek(new Date());
    const weeks: { key: string; label: string; expected: number; overdue: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i * 7);
      weeks.push({ key: weekKey(d), label: `Week of ${weekLabel(weekKey(d))}`, expected: 0, overdue: 0 });
    }
    invoices.filter(i => i.status === "issued" || i.status === "overdue").forEach(i => {
      const out = Number(i.total_amount) - Number(i.paid_amount);
      if (out <= 0) return;
      const wk = weekKey(new Date(i.due_date));
      const target = weeks.find(w => w.key === wk);
      if (target) {
        target.expected += out;
      } else if (new Date(i.due_date) < today) {
        weeks[0].overdue += out;
      }
    });
    return weeks;
  }, [invoices]);

  const maxForecast = Math.max(1, ...forecast.map(w => w.expected + w.overdue));
  const totalExpected = forecast.reduce((s, w) => s + w.expected + w.overdue, 0);

  return (
    <div className="space-y-4">
      <CashFlowChart payments={payments} expenses={expenses} />

      <Card className="p-3 sm:p-4">
        <div className="flex justify-between items-baseline mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-sm">Forecast · Next 8 weeks</h3>
          <div className="text-xs sm:text-sm">Expected: <span className="font-semibold text-emerald-600">{formatINR(totalExpected)}</span></div>
        </div>
        <div className="space-y-1.5">
          {forecast.map(w => {
            return (
              <div key={w.key} className="flex items-center gap-2 sm:gap-3">
                <div className="w-24 sm:w-32 text-[11px] sm:text-xs text-muted-foreground shrink-0 truncate">{w.label}</div>
                <div className="flex-1 bg-muted/40 rounded h-6 sm:h-7 relative overflow-hidden">
                  {w.overdue > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 bg-destructive/70" style={{ width: `${(w.overdue / maxForecast) * 100}%` }} />
                  )}
                  <div className="absolute top-0 bottom-0 bg-emerald-500/80" style={{ left: `${(w.overdue / maxForecast) * 100}%`, width: `${(w.expected / maxForecast) * 100}%` }} />
                  <div className="absolute inset-0 flex items-center px-2 text-[11px] sm:text-xs font-medium">
                    {w.expected + w.overdue > 0 && formatINR(w.expected + w.overdue)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-[11px] text-muted-foreground mt-3 flex flex-wrap gap-3">
          <span><span className="inline-block w-3 h-3 bg-emerald-500/80 rounded-sm align-middle mr-1" /> Expected on due date</span>
          <span><span className="inline-block w-3 h-3 bg-destructive/70 rounded-sm align-middle mr-1" /> Already overdue</span>
        </div>
      </Card>
    </div>
  );
}
