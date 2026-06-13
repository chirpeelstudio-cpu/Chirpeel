import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Invoice, Payment } from "../types";
import { formatINR } from "../types";

interface Props {
  invoices: Invoice[];
  payments: Payment[];
  months?: number;
}

type SeriesKey = "invoiced" | "collected";

const SERIES_COLOR: Record<SeriesKey, string> = {
  invoiced: "hsl(217 91% 60%)",
  collected: "hsl(160 84% 39%)",
};

const SERIES_LABEL: Record<SeriesKey, string> = {
  invoiced: "Invoiced",
  collected: "Collected",
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function fullMonthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

interface BucketRow {
  key: string;
  label: string;
  invoiced: number;
  collected: number;
}

const statusTone: Record<string, string> = {
  paid: "bg-emerald-500",
  issued: "bg-primary",
  overdue: "bg-destructive",
  draft: "bg-muted-foreground/50",
  cancelled: "bg-muted-foreground/30",
};

export function RevenueTrendChart({ invoices, payments, months = 6 }: Props) {
  const [hidden, setHidden] = useState<Record<SeriesKey, boolean>>({
    invoiced: false,
    collected: false,
  });
  const [drill, setDrill] = useState<{ key: string; series: SeriesKey } | null>(null);

  const data: BucketRow[] = useMemo(() => {
    const today = new Date();
    const buckets: Record<string, BucketRow> = {};
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const k = monthKey(d);
      buckets[k] = { key: k, label: monthLabel(k), invoiced: 0, collected: 0 };
    }
    invoices.forEach((inv) => {
      const k = monthKey(new Date(inv.issue_date));
      if (buckets[k] && inv.status !== "cancelled")
        buckets[k].invoiced += Number(inv.total_amount);
    });
    payments.forEach((p) => {
      const k = monthKey(new Date(p.paid_on));
      if (buckets[k]) buckets[k].collected += Number(p.amount);
    });
    return Object.values(buckets);
  }, [invoices, payments, months]);

  const drillItems = useMemo(() => {
    if (!drill) return { invoices: [] as Invoice[], payments: [] as Payment[] };
    const inMonth = (iso: string) => monthKey(new Date(iso)) === drill.key;
    return {
      invoices: invoices.filter(
        (i) => inMonth(i.issue_date) && i.status !== "cancelled",
      ),
      payments: payments.filter((p) => inMonth(p.paid_on)),
    };
  }, [drill, invoices, payments]);

  const totalInvoiced = drill ? drillItems.invoices.reduce((s, i) => s + Number(i.total_amount), 0) : 0;
  const totalCollected = drill ? drillItems.payments.reduce((s, p) => s + Number(p.amount), 0) : 0;

  const toggleSeries = (key: SeriesKey) =>
    setHidden((h) => ({ ...h, [key]: !h[key] }));

  const handleBarClick = (payload: BucketRow | undefined) => {
    if (!payload) return;
    setDrill({ key: payload.key, series: "invoiced" });
  };
  const handleLineClick = (payload: BucketRow | undefined) => {
    if (!payload) return;
    setDrill({ key: payload.key, series: "collected" });
  };

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-sm font-semibold">Revenue Trend · Last {months} months</h3>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          Click or press Enter / Space on chips to drill in
        </span>
      </div>

      {/* Custom clickable legend */}
      <div className="flex items-center gap-3 mb-2 px-1" role="group" aria-label="Toggle chart series">
        {(Object.keys(SERIES_LABEL) as SeriesKey[]).map((k) => {
          const isHidden = hidden[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleSeries(k)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleSeries(k);
                }
              }}
              className={`flex items-center gap-1.5 text-[11px] transition-opacity ${
                isHidden ? "opacity-40" : "opacity-100"
              } hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1`}
              aria-pressed={!isHidden}
              aria-label={`${isHidden ? "Show" : "Hide"} ${SERIES_LABEL[k]} series`}
              title={isHidden ? `Show ${SERIES_LABEL[k]}` : `Hide ${SERIES_LABEL[k]}`}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: SERIES_COLOR[k] }}
                aria-hidden="true"
              />
              <span className={isHidden ? "line-through" : ""}>{SERIES_LABEL[k]}</span>
            </button>
          );
        })}
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v) =>
                v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
              }
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              content={<RevenueTooltip />}
            />
            <Legend content={() => null} />
            {!hidden.invoiced && (
              <Bar
                dataKey="invoiced"
                name="Invoiced"
                fill={SERIES_COLOR.invoiced}
                radius={[3, 3, 0, 0]}
                onClick={(p: any) => handleBarClick(p?.payload)}
                style={{ cursor: "pointer" }}
              />
            )}
            {!hidden.collected && (
              <Line
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke={SERIES_COLOR.collected}
                strokeWidth={2}
                dot={{ r: 3, style: { cursor: "pointer" } }}
                activeDot={{
                  r: 5,
                  style: { cursor: "pointer" },
                  onClick: (_: any, p: any) => handleLineClick(p?.payload),
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Keyboard-accessible chart points (focusable for screen reader & keyboard users) */}
      <div
        className="mt-2 flex flex-wrap gap-1 px-1"
        role="group"
        aria-label="Chart data points — press Enter or Space to drill in"
      >
        {data.map((row) => {
          const series: SeriesKey[] = [];
          if (!hidden.invoiced) series.push("invoiced");
          if (!hidden.collected) series.push("collected");
          return series.map((s) => {
            const value = s === "invoiced" ? row.invoiced : row.collected;
            return (
              <button
                key={`${row.key}-${s}`}
                type="button"
                onClick={() => setDrill({ key: row.key, series: s })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDrill({ key: row.key, series: s });
                  }
                }}
                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-background hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                aria-label={`${row.label} ${SERIES_LABEL[s]} ${formatINR(value)} — drill in`}
                title={`${row.label} · ${SERIES_LABEL[s]} · ${formatINR(value)}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-sm"
                  style={{ backgroundColor: SERIES_COLOR[s] }}
                  aria-hidden="true"
                />
                <span className="tabular-nums">{row.label}</span>
              </button>
            );
          });
        })}
      </div>

      {/* Drill-down sheet */}
      <Sheet open={drill !== null} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {drill && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle>{fullMonthLabel(drill.key)}</SheetTitle>
                <SheetDescription>
                  {formatINR(totalInvoiced)} invoiced · {formatINR(totalCollected)} collected
                </SheetDescription>
              </SheetHeader>

              {/* Quick toggle between the two views */}
              <div className="flex gap-2 mt-4">
                {(["invoiced", "collected"] as SeriesKey[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDrill({ ...drill, series: s })}
                    className={`flex-1 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                      drill.series === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {SERIES_LABEL[s]} ·{" "}
                    {s === "invoiced"
                      ? drillItems.invoices.length
                      : drillItems.payments.length}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                {drill.series === "invoiced" ? (
                  <DrillInvoices items={drillItems.invoices} />
                ) : (
                  <DrillPayments items={drillItems.payments} />
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload as BucketRow;
  const collectionPct =
    row.invoiced > 0 ? Math.round((row.collected / row.invoiced) * 100) : 0;
  return (
    <div className="rounded-md border bg-popover text-popover-foreground shadow-md text-xs p-2.5 min-w-[160px]">
      <div className="font-semibold mb-1.5">{label}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: SERIES_COLOR.invoiced }}
            />
            <span className="text-muted-foreground">Invoiced</span>
          </div>
          <span className="font-semibold tabular-nums">{formatINR(row.invoiced)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: SERIES_COLOR.collected }}
            />
            <span className="text-muted-foreground">Collected</span>
          </div>
          <span className="font-semibold tabular-nums text-emerald-600">
            {formatINR(row.collected)}
          </span>
        </div>
        <div className="border-t pt-1 mt-1 flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Collection rate</span>
          <span className="font-medium tabular-nums">{collectionPct}%</span>
        </div>
      </div>
      <div className="mt-1.5 text-[10px] text-muted-foreground italic">Click to drill in</div>
    </div>
  );
}

function DrillInvoices({ items }: { items: Invoice[] }) {
  if (items.length === 0)
    return <p className="text-xs text-muted-foreground py-6 text-center">No invoices in this month.</p>;
  return (
    <div className="divide-y border rounded-md">
      {items.map((i) => (
        <div key={i.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  statusTone[i.status] || "bg-muted-foreground/40"
                }`}
              />
              <span className="text-xs font-mono font-medium truncate">
                {i.invoice_number}
              </span>
              <Badge variant="outline" className="h-4 text-[9px] px-1 capitalize">
                {i.status}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
              {i.customer_name}
            </div>
          </div>
          <div className="text-sm font-semibold tabular-nums shrink-0">
            {formatINR(Number(i.total_amount))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DrillPayments({ items }: { items: Payment[] }) {
  if (items.length === 0)
    return <p className="text-xs text-muted-foreground py-6 text-center">No payments in this month.</p>;
  return (
    <div className="divide-y border rounded-md">
      {items.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate">
              {p.mode.toUpperCase()}
              {p.reference ? ` · ${p.reference}` : ""}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {new Date(p.paid_on).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
              {p.milestone ? ` · ${p.milestone}` : ""}
            </div>
          </div>
          <div className="text-sm font-semibold tabular-nums text-emerald-600 shrink-0">
            {formatINR(Number(p.amount))}
          </div>
        </div>
      ))}
    </div>
  );
}
