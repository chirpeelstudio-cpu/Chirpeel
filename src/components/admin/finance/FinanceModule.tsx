import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, FileText, Receipt, AlertCircle, TrendingUp, BarChart3 } from "lucide-react";
import { FinanceOverview } from "./FinanceOverview";
import { PaymentsTab } from "./PaymentsTab";
import { InvoicesTab } from "./InvoicesTab";
import { ExpensesTab } from "./ExpensesTab";
import { AgingTab } from "./AgingTab";
import { CashFlowTab } from "./CashFlowTab";
import { FinanceToolbar } from "./FinanceToolbar";
import type { Invoice, Payment, Expense, QuotationLite } from "./types";
import type { FinanceFilters } from "./filters";
import { DEFAULT_FILTERS, applyInvoiceFilters, applyPaymentFilters, applyExpenseFilters } from "./filters";
import { useLocalCache } from "@/hooks/useLocalCache";

export default function FinanceModule() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [quotations, setQuotations] = useState<QuotationLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["overview", "payments", "invoices", "expenses", "aging", "cashflow"].includes(tab)) {
        return tab;
      }
    }
    return "overview";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["overview", "payments", "invoices", "expenses", "aging", "cashflow"].includes(tab) && tab !== activeTab) {
        setActiveTab(tab);
      }
    }
  }, [activeTab]);

  const { value: filters, setValue: setFilters } = useLocalCache<FinanceFilters>("finance.filters", DEFAULT_FILTERS);

  const refresh = useCallback(async () => {
    setLoading(true);
    await supabase.rpc("mark_overdue_invoices");
    const [inv, pay, exp, quo] = await Promise.all([
      supabase.from("invoices").select("*").order("issue_date", { ascending: false }),
      supabase.from("payments").select("*").order("paid_on", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("quotations").select("id, quotation_number, customer_name, customer_phone, customer_email, project_name, total_amount, lead_id, status").order("created_at", { ascending: false }),
    ]);
    setInvoices((inv.data ?? []) as Invoice[]);
    setPayments((pay.data ?? []) as Payment[]);
    setExpenses((exp.data ?? []) as Expense[]);
    setQuotations((quo.data ?? []) as QuotationLite[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Filtered slices used by every tab
  const filteredInvoices = useMemo(() => applyInvoiceFilters(invoices, filters), [invoices, filters]);
  const filteredPayments = useMemo(() => applyPaymentFilters(payments, filters), [payments, filters]);
  const filteredExpenses = useMemo(() => applyExpenseFilters(expenses, filters), [expenses, filters]);

  const stats = useMemo(() => {
    const totalInvoiced = filteredInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalCollected = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const outstanding = filteredInvoices
      .filter(i => i.status !== "paid" && i.status !== "cancelled")
      .reduce((s, i) => s + (Number(i.total_amount || 0) - Number(i.paid_amount || 0)), 0);
    const overdue = filteredInvoices.filter(i => i.status === "overdue").length;
    const profit = totalCollected - totalExpenses;
    return { totalInvoiced, totalCollected, totalExpenses, outstanding, overdue, profit };
  }, [filteredInvoices, filteredPayments, filteredExpenses]);

  const allTimeStats = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const outstanding = invoices
      .filter(i => i.status !== "paid" && i.status !== "cancelled")
      .reduce((s, i) => s + (Number(i.total_amount || 0) - Number(i.paid_amount || 0)), 0);
    const overdue = invoices.filter(i => i.status === "overdue").length;
    const profit = totalCollected - totalExpenses;
    return { totalInvoiced, totalCollected, totalExpenses, outstanding, overdue, profit };
  }, [invoices, payments, expenses]);

  return (
    <div className="space-y-4">
      <FinanceToolbar filters={filters} onChange={setFilters} quotations={quotations} />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.set("tab", v);
            window.history.replaceState(null, "", url.toString());
          }
        }}
        className="w-full"
      >
        <div className="-mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto scrollbar-none">
          <TabsList data-tour-id="finance-tabs" className="inline-flex w-max sm:w-full sm:max-w-3xl sm:grid sm:grid-cols-6">
            <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-4 h-4" /> <span>Overview</span></TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5"><Wallet className="w-4 h-4" /> <span>Payments</span></TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5"><FileText className="w-4 h-4" /> <span>Invoices</span></TabsTrigger>
            <TabsTrigger value="expenses" className="gap-1.5"><Receipt className="w-4 h-4" /> <span>Expenses</span></TabsTrigger>
            <TabsTrigger value="aging" className="gap-1.5"><AlertCircle className="w-4 h-4" /> <span>Aging</span></TabsTrigger>
            <TabsTrigger value="cashflow" className="gap-1.5"><TrendingUp className="w-4 h-4" /> <span>Cash Flow</span></TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <FinanceOverview
            stats={stats}
            allTimeStats={allTimeStats}
            invoices={filteredInvoices}
            payments={filteredPayments}
            expenses={filteredExpenses}
            unfilteredInvoices={invoices}
            unfilteredPayments={payments}
            unfilteredExpenses={expenses}
            quotations={quotations}
            loading={loading}
          />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab payments={filteredPayments} quotations={quotations} invoices={invoices} onRefresh={refresh} loading={loading} />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab invoices={filteredInvoices} quotations={quotations} payments={filteredPayments} onRefresh={refresh} loading={loading} />
        </TabsContent>
        <TabsContent value="expenses" className="mt-4">
          <ExpensesTab expenses={filteredExpenses} quotations={quotations} onRefresh={refresh} loading={loading} />
        </TabsContent>
        <TabsContent value="aging" className="mt-4">
          <AgingTab invoices={filteredInvoices} onRefresh={refresh} />
        </TabsContent>
        <TabsContent value="cashflow" className="mt-4">
          <CashFlowTab invoices={filteredInvoices} payments={filteredPayments} expenses={filteredExpenses} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
