import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { formatINR } from "./types";
import type { Invoice, Payment, Expense, QuotationLite } from "./types";
import {
  Wallet,
  FileText,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Inbox,
  ChevronRight,
} from "lucide-react";
import { RevenueTrendChart } from "./charts/RevenueTrendChart";

interface Stats {
  totalInvoiced: number;
  totalCollected: number;
  totalExpenses: number;
  outstanding: number;
  overdue: number;
  profit: number;
}

interface Props {
  stats: Stats;
  allTimeStats: Stats;
  invoices: Invoice[];
  payments: Payment[];
  expenses?: Expense[];
  unfilteredInvoices: Invoice[];
  unfilteredPayments: Payment[];
  unfilteredExpenses?: Expense[];
  quotations: QuotationLite[];
  loading: boolean;
}

const statusTone: Record<string, string> = {
  paid: "bg-emerald-500",
  issued: "bg-primary",
  overdue: "bg-destructive",
  draft: "bg-muted-foreground/50",
  cancelled: "bg-muted-foreground/30",
};

type DrillKey =
  | "invoiced"
  | "collected"
  | "expenses"
  | "profit"
  | "collection_rate"
  | "outstanding"
  | null;

export function FinanceOverview({
  stats,
  allTimeStats,
  invoices,
  payments,
  expenses = [],
  unfilteredInvoices,
  unfilteredPayments,
  unfilteredExpenses = [],
  quotations,
  loading
}: Props) {
  const recentPayments = payments.slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);
  const [drill, setDrill] = useState<DrillKey>(null);

  // Range-specific collection rate calculation
  const hasInvoicedInPeriod = stats.totalInvoiced > 0;
  const periodCollectionRate = hasInvoicedInPeriod
    ? Math.min(100, Math.round((stats.totalCollected / stats.totalInvoiced) * 100))
    : 0;

  // Global collection rate calculation to handle 0% period collections rate safely
  const globalCollectionRate = allTimeStats.totalInvoiced > 0
    ? Math.min(100, Math.round((allTimeStats.totalCollected / allTimeStats.totalInvoiced) * 100))
    : 100;

  const collectionRate = hasInvoicedInPeriod ? periodCollectionRate : globalCollectionRate;

  const profitMargin =
    stats.totalCollected > 0 ? Math.round((stats.profit / stats.totalCollected) * 100) : 0;
  const profitPositive = stats.profit >= 0;

  // Group expenses by category
  const expenseCategories = useMemo(() => {
    const cats: Record<string, { label: string; amount: number; color: string }> = {
      material: { label: "Materials", amount: 0, color: "bg-emerald-500" },
      labour: { label: "Labour", amount: 0, color: "bg-blue-500" },
      transport: { label: "Transport/Logistics", amount: 0, color: "bg-purple-500" },
      overhead: { label: "Overheads", amount: 0, color: "bg-amber-500" },
      other: { label: "Miscellaneous", amount: 0, color: "bg-slate-500" },
    };

    expenses.forEach(e => {
      const catKey = (e.category || "other").toLowerCase();
      if (cats[catKey]) {
        cats[catKey].amount += Number(e.amount || 0);
      } else {
        cats.other.amount += Number(e.amount || 0);
      }
    });

    const total = Object.values(cats).reduce((sum, c) => sum + c.amount, 0);

    return Object.entries(cats)
      .map(([key, value]) => ({
        key,
        ...value,
        percentage: total > 0 ? Math.round((value.amount / total) * 100) : 0,
      }))
      .filter(c => c.amount > 0 || c.key === "other")
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Calculate financials per client project
  const projectMetrics = useMemo(() => {
    if (!quotations || quotations.length === 0) return [];
    
    return quotations.map(q => {
      const qInvoices = unfilteredInvoices.filter(i => i.quotation_id === q.id);
      const totalInvoiced = qInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
      const totalPaid = qInvoices.reduce((sum, i) => sum + Number(i.paid_amount || 0), 0);
      
      const qPayments = unfilteredPayments.filter(p => p.quotation_id === q.id);
      const totalCollected = qPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const qExpenses = unfilteredExpenses.filter(e => e.quotation_id === q.id);
      const totalExpenses = qExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const netProfit = totalCollected - totalExpenses;
      const margin = totalCollected > 0 ? Math.round((netProfit / totalCollected) * 100) : 0;
      const outstanding = totalInvoiced - totalPaid;

      return {
        id: q.id,
        projectNumber: q.quotation_number,
        projectName: q.project_name || "Client Project",
        customerName: q.customer_name,
        totalInvoiced,
        totalCollected,
        totalExpenses,
        netProfit,
        margin,
        outstanding
      };
    }).filter(p => p.totalInvoiced > 0 || p.totalCollected > 0 || p.totalExpenses > 0);
  }, [quotations, unfilteredInvoices, unfilteredPayments, unfilteredExpenses]);

  const drillData = useMemo(() => {
    switch (drill) {
      case "invoiced":
        return {
          title: "All invoices",
          description: `${invoices.length} invoices · ${formatINR(stats.totalInvoiced)} total`,
          kind: "invoices" as const,
          items: invoices,
        };
      case "collection_rate":
      case "collected":
        return {
          title: drill === "collected" ? "Payments collected" : "Collection breakdown",
          description: `${payments.length} payments · ${formatINR(stats.totalCollected)} received`,
          kind: "payments" as const,
          items: payments,
        };
      case "expenses":
        return {
          title: "Expenses",
          description: `${expenses.length} entries · ${formatINR(stats.totalExpenses)} total`,
          kind: "expenses" as const,
          items: expenses,
        };
      case "outstanding": {
        const outItems = invoices.filter(i => i.status !== "paid" && i.status !== "cancelled");
        return {
          title: "Outstanding invoices",
          description: `${outItems.length} unpaid · ${formatINR(stats.outstanding)} due${
            stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ""
          }`,
          kind: "invoices" as const,
          items: outItems,
        };
      }
      case "profit":
        return {
          title: "Profit breakdown",
          description: `${formatINR(stats.totalCollected)} collected − ${formatINR(
            stats.totalExpenses,
          )} expenses = ${formatINR(stats.profit)}`,
          kind: "profit" as const,
          items: [],
        };
      default:
        return null;
    }
  }, [drill, invoices, payments, expenses, stats]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* HERO STRIP — 3 prominent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Net Profit */}
        <ClickableCard onClick={() => setDrill("profit")} ariaLabel="View profit breakdown">
          <Card className="relative overflow-hidden p-4 sm:p-5 h-full">
            <div
              className={`absolute inset-0 opacity-[0.06] ${
                profitPositive ? "bg-emerald-500" : "bg-destructive"
              }`}
              aria-hidden
            />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Net Profit
                </span>
                <div
                  className={`p-1.5 rounded-md ${
                    profitPositive ? "bg-emerald-500/10" : "bg-destructive/10"
                  }`}
                >
                  {profitPositive ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div
                  className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                    profitPositive ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {formatINR(stats.profit)}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1.5">
                {profitPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
                )}
                <span className="text-xs text-muted-foreground">
                  {profitMargin}% margin on collections
                </span>
              </div>
            </div>
          </Card>
        </ClickableCard>

        {/* Collection Rate */}
        <ClickableCard onClick={() => setDrill("collection_rate")} ariaLabel="View collection breakdown">
          <Card className="p-4 sm:p-5 h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Collection Rate
              </span>
              <div className="p-1.5 rounded-md bg-primary/10">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold tracking-tight">
                {collectionRate}
                <span className="text-lg text-muted-foreground">%</span>
              </div>
            )}
            <div className="mt-3 space-y-1.5">
              <Progress value={loading ? 0 : collectionRate} className="h-1.5" />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{loading ? "—" : formatINR(stats.totalCollected)} in</span>
                <span>of {loading ? "—" : formatINR(stats.totalInvoiced)}</span>
              </div>
            </div>
          </Card>
        </ClickableCard>
        {/* At Risk */}
        <ClickableCard onClick={() => setDrill("outstanding")} ariaLabel="View outstanding invoices">
          <Card
            className={`p-4 sm:p-5 h-full ${
              allTimeStats.overdue > 0 ? "ring-1 ring-destructive/30" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                At Risk
              </span>
              <div
                className={`p-1.5 rounded-md ${
                  allTimeStats.overdue > 0 ? "bg-destructive/10" : "bg-amber-500/10"
                }`}
              >
                <AlertCircle
                  className={`w-4 h-4 ${
                    allTimeStats.overdue > 0 ? "text-destructive" : "text-amber-600"
                  }`}
                />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600">
                {formatINR(allTimeStats.outstanding)}
              </div>
            )}
            <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground font-medium">
              <span>Overall Outstanding</span>
              {allTimeStats.overdue > 0 && (
                <Badge variant="destructive" className="h-5 text-[10px] px-1.5 font-bold">
                  {allTimeStats.overdue} overdue
                </Badge>
              )}
            </div>
            {!loading && stats.outstanding !== allTimeStats.outstanding && (
              <div className="text-[10px] text-muted-foreground/80 mt-1">
                {formatINR(stats.outstanding)} due in selected period
              </div>
            )}
          </Card>
        </ClickableCard>
      </div>

      {/* SECONDARY KPI ROW — snap on mobile, grid on desktop */}
      <div className="-mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="flex sm:grid sm:grid-cols-3 gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-none pb-1 sm:pb-0">
          <KpiChip
            label="Invoiced"
            value={loading ? null : formatINR(stats.totalInvoiced)}
            icon={FileText}
            onClick={() => setDrill("invoiced")}
          />
          <KpiChip
            label="Collected"
            value={loading ? null : formatINR(stats.totalCollected)}
            icon={Wallet}
            tone="text-emerald-600"
            onClick={() => setDrill("collected")}
          />
          <KpiChip
            label="Expenses"
            value={loading ? null : formatINR(stats.totalExpenses)}
            icon={Receipt}
            tone="text-orange-600"
            onClick={() => setDrill("expenses")}
          />
        </div>
      </div>

      {/* CHART */}
      <RevenueTrendChart invoices={invoices} payments={payments} />

      {/* NEW: FINANCIAL INSIGHTS WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Project Profitability */}
        <Card className="p-4 lg:col-span-2 shadow-sm border-border/80">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm tracking-tight">Project Financial Health</h3>
            <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-0.5 rounded bg-muted">
              {projectMetrics.length} Active
            </span>
          </div>
          {projectMetrics.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              No project financial breakdowns found.
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-xs text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold pb-1">
                    <th className="py-2 pr-2">Project / Client</th>
                    <th className="py-2 px-2 text-right">Invoiced</th>
                    <th className="py-2 px-2 text-right">Collected</th>
                    <th className="py-2 px-2 text-right">Expenses</th>
                    <th className="py-2 px-2 text-right">Profit</th>
                    <th className="py-2 px-2 text-right">Margin</th>
                    <th className="py-2 pl-2 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {projectMetrics.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-2 font-medium">
                        <div className="font-semibold text-foreground truncate max-w-[150px]">{p.customerName}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {p.projectNumber} · {p.projectName}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">{formatINR(p.totalInvoiced)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-emerald-600 font-semibold">{formatINR(p.totalCollected)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-orange-600">{formatINR(p.totalExpenses)}</td>
                      <td className={`py-2.5 px-2 text-right tabular-nums font-semibold ${p.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {formatINR(p.netProfit)}
                      </td>
                      <td className={`py-2.5 px-2 text-right tabular-nums font-medium ${p.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {p.margin}%
                      </td>
                      <td className="py-2.5 pl-2 text-right tabular-nums text-amber-600 font-semibold">
                        {p.outstanding > 0 ? formatINR(p.outstanding) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Expenses by Category */}
        <Card className="p-4 shadow-sm border-border/80 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm mb-4 tracking-tight">Expenses by Category</h3>
            <div className="space-y-4">
              {expenseCategories.map((c) => (
                <div key={c.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">{c.label}</span>
                    <span className="text-muted-foreground tabular-nums">{formatINR(c.amount)} ({c.percentage}%)</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${c.color} rounded-full transition-all`} style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              ))}
              {expenseCategories.length === 0 && (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  No expenses logged.
                </div>
              )}
            </div>
          </div>
          {expenseCategories.length > 0 && (
            <div className="text-[10px] text-muted-foreground pt-3 border-t border-border/40 mt-4">
              Total Expenses: <span className="font-bold text-foreground">{formatINR(expenseCategories.reduce((s, c) => s + c.amount, 0))}</span>
            </div>
          )}
        </Card>
      </div>

      {/* RECENT ACTIVITY — tabs on mobile, side-by-side on desktop */}
      <div className="sm:hidden">
        <Card className="p-3">
          <Tabs defaultValue="payments">
            <TabsList className="grid grid-cols-2 w-full h-9">
              <TabsTrigger value="payments" className="text-xs">
                Recent Payments
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs">
                Recent Invoices
              </TabsTrigger>
            </TabsList>
            <TabsContent value="payments" className="mt-3">
              <PaymentsList items={recentPayments} loading={loading} />
            </TabsContent>
            <TabsContent value="invoices" className="mt-3">
              <InvoicesList items={recentInvoices} loading={loading} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <div className="hidden sm:grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Recent Payments</h3>
            <span className="text-[11px] text-muted-foreground">
              {recentPayments.length} of {payments.length}
            </span>
          </div>
          <PaymentsList items={recentPayments} loading={loading} />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Recent Invoices</h3>
            <span className="text-[11px] text-muted-foreground">
              {recentInvoices.length} of {invoices.length}
            </span>
          </div>
          <InvoicesList items={recentInvoices} loading={loading} />
        </Card>
      </div>

      {/* DRILL-DOWN SHEET */}
      <Sheet open={drill !== null} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {drillData && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle>{drillData.title}</SheetTitle>
                <SheetDescription>{drillData.description}</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                {drillData.kind === "invoices" && (
                  <DrillInvoiceList items={drillData.items as Invoice[]} />
                )}
                {drillData.kind === "payments" && (
                  <DrillPaymentList items={drillData.items as Payment[]} />
                )}
                {drillData.kind === "expenses" && (
                  <DrillExpenseList items={drillData.items as Expense[]} />
                )}
                {drillData.kind === "profit" && (
                  <ProfitBreakdown
                    collected={stats.totalCollected}
                    expenseTotal={stats.totalExpenses}
                    profit={stats.profit}
                    onShowCollected={() => setDrill("collected")}
                    onShowExpenses={() => setDrill("expenses")}
                  />
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ClickableCard({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="text-left w-full rounded-lg transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

function KpiChip({
  label,
  value,
  icon: Icon,
  tone = "text-foreground",
  onClick,
}: {
  label: string;
  value: string | null;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="snap-start shrink-0 w-[44%] sm:w-auto text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="p-3 hover:bg-muted/40 transition-colors h-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </span>
          <Icon className={`w-3.5 h-3.5 ${tone}`} />
        </div>
        {value === null ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <div className={`text-base font-semibold tabular-nums ${tone}`}>{value}</div>
        )}
      </Card>
    </button>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Inbox className="w-8 h-8 text-muted-foreground/40 mb-2" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PaymentsList({ items, loading }: { items: Payment[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (items.length === 0) return <EmptyRow label="No payments recorded yet." />;
  return (
    <div className="divide-y">
      {items.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between py-2 px-1 -mx-1 rounded hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">
                {p.mode.toUpperCase()} {p.reference ? `· ${p.reference}` : ""}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(p.paid_on).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </div>
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

function InvoicesList({ items, loading }: { items: Invoice[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (items.length === 0) return <EmptyRow label="No invoices yet." />;
  return (
    <div className="divide-y">
      {items.map((i) => (
        <div
          key={i.id}
          className="flex items-center justify-between py-2 px-1 -mx-1 rounded hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                statusTone[i.status] || "bg-muted-foreground/40"
              }`}
            />
            <div className="min-w-0">
              <div className="text-xs font-medium font-mono truncate">{i.invoice_number}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {i.customer_name}
              </div>
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

/* ---------- Drill-down lists (richer, scrollable) ---------- */

function DrillInvoiceList({ items }: { items: Invoice[] }) {
  if (items.length === 0) return <EmptyRow label="Nothing matches the current filters." />;
  return (
    <div className="divide-y border rounded-md">
      {items.map((i) => {
        const due = Number(i.total_amount || 0) - Number(i.paid_amount || 0);
        return (
          <div key={i.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    statusTone[i.status] || "bg-muted-foreground/40"
                  }`}
                />
                <span className="text-xs font-mono font-medium truncate">{i.invoice_number}</span>
                <Badge variant="outline" className="h-4 text-[9px] px-1 capitalize">
                  {i.status}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                {i.customer_name} · due {new Date(i.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold tabular-nums">{formatINR(Number(i.total_amount))}</div>
              {due > 0 && i.status !== "cancelled" && (
                <div className="text-[10px] text-amber-600 tabular-nums">{formatINR(due)} due</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DrillPaymentList({ items }: { items: Payment[] }) {
  if (items.length === 0) return <EmptyRow label="No payments match the current filters." />;
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
                year: "numeric",
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

function DrillExpenseList({ items }: { items: Expense[] }) {
  if (items.length === 0) return <EmptyRow label="No expenses match the current filters." />;
  return (
    <div className="divide-y border rounded-md">
      {items.map((e) => (
        <div key={e.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate">
              {e.vendor || e.description || "Expense"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {new Date(e.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              {e.category ? ` · ${e.category}` : ""}
            </div>
          </div>
          <div className="text-sm font-semibold tabular-nums text-orange-600 shrink-0">
            {formatINR(Number(e.amount))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfitBreakdown({
  collected,
  expenseTotal,
  profit,
  onShowCollected,
  onShowExpenses,
}: {
  collected: number;
  expenseTotal: number;
  profit: number;
  onShowCollected: () => void;
  onShowExpenses: () => void;
}) {
  const positive = profit >= 0;
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onShowCollected}
        className="w-full flex items-center justify-between px-3 py-3 border rounded-md hover:bg-muted/40 transition-colors text-left"
      >
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Collected</div>
          <div className="text-sm font-semibold tabular-nums text-emerald-600">{formatINR(collected)}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
      <button
        type="button"
        onClick={onShowExpenses}
        className="w-full flex items-center justify-between px-3 py-3 border rounded-md hover:bg-muted/40 transition-colors text-left"
      >
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Expenses</div>
          <div className="text-sm font-semibold tabular-nums text-orange-600">−{formatINR(expenseTotal)}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
      <div
        className={`px-3 py-3 rounded-md ${
          positive ? "bg-emerald-500/10" : "bg-destructive/10"
        }`}
      >
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Net Profit</div>
        <div
          className={`text-lg font-bold tabular-nums ${
            positive ? "text-emerald-600" : "text-destructive"
          }`}
        >
          {formatINR(profit)}
        </div>
      </div>
    </div>
  );
}
