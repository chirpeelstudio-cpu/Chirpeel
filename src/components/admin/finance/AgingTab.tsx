import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, Download, FileDown, Loader2, BellRing } from "lucide-react";
import { formatINR } from "./types";
import type { Invoice } from "./types";
import { ageBucket, buildWhatsAppLink, reminderMessage } from "./finance-utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AgingDonut } from "./charts/AgingDonut";
import { exportAgingCSV, exportAgingPDF } from "./export-utils";

interface Props {
  invoices: Invoice[];
  onRefresh: () => void;
}

export function AgingTab({ invoices, onRefresh }: Props) {
  const [bulkSending, setBulkSending] = useState(false);
  const [exporting, setExporting] = useState(false);

  const open = invoices.filter(i => i.status !== "paid" && i.status !== "cancelled" && i.status !== "draft");

  const buckets = useMemo(() => {
    const b = {
      current: { count: 0, total: 0, items: [] as Invoice[] },
      "0-30": { count: 0, total: 0, items: [] as Invoice[] },
      "31-60": { count: 0, total: 0, items: [] as Invoice[] },
      "60+": { count: 0, total: 0, items: [] as Invoice[] },
    };
    open.forEach(i => {
      const k = ageBucket(i.due_date);
      const out = Number(i.total_amount) - Number(i.paid_amount);
      b[k].count += 1;
      b[k].total += out;
      b[k].items.push(i);
    });
    return b;
  }, [open]);

  const sendEmail = async (inv: Invoice) => {
    if (!inv.customer_email) { toast({ title: "No email on file", variant: "destructive" }); return; }
    const { error } = await supabase.functions.invoke("send-payment-reminder", { body: { invoice_id: inv.id, manual: true } });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Email sent" }); onRefresh(); }
  };

  const sendAllOverdue = async () => {
    if (!confirm("Send email reminders to all overdue customers?")) return;
    setBulkSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-payment-reminder", { body: {} });
      if (error) throw error;
      toast({ title: `Sent ${data?.sent ?? 0} reminder(s)`, description: data?.failed ? `${data.failed} failed` : undefined });
      onRefresh();
    } catch (e) {
      toast({ title: "Bulk reminder failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBulkSending(false); }
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { data: company } = await supabase.from("company_settings").select("*").maybeSingle();
      exportAgingPDF(open, company);
    } finally { setExporting(false); }
  };

  const bucketCards = [
    { key: "current", label: "Current", tone: "bg-muted/40" },
    { key: "0-30", label: "0–30 days", tone: "bg-amber-50 dark:bg-amber-950/30" },
    { key: "31-60", label: "31–60 days", tone: "bg-orange-50 dark:bg-orange-950/30" },
    { key: "60+", label: "60+ days", tone: "bg-red-50 dark:bg-red-950/30" },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          {/* Bucket cards: snap-scroll on mobile, grid on desktop */}
          <div className="md:hidden -mx-3 px-3 overflow-x-auto scrollbar-none snap-x snap-mandatory flex gap-2">
            {bucketCards.map(b => {
              const data = buckets[b.key];
              return (
                <Card key={b.key} className={`p-3 ${b.tone} snap-start min-w-[140px] shrink-0`}>
                  <div className="text-[11px] text-muted-foreground mb-1">{b.label}</div>
                  <div className="text-base font-bold">{formatINR(data.total)}</div>
                  <div className="text-[11px] text-muted-foreground">{data.count} invoice(s)</div>
                </Card>
              );
            })}
          </div>
          <div className="hidden md:grid grid-cols-4 gap-3">
            {bucketCards.map(b => {
              const data = buckets[b.key];
              return (
                <Card key={b.key} className={`p-4 ${b.tone}`}>
                  <div className="text-xs text-muted-foreground mb-1">{b.label}</div>
                  <div className="text-xl font-bold">{formatINR(data.total)}</div>
                  <div className="text-xs text-muted-foreground">{data.count} invoice(s)</div>
                </Card>
              );
            })}
          </div>
        </div>
        <AgingDonut invoices={open} />
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex justify-between items-start sm:items-center mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-sm sm:text-base">Outstanding Invoices</h3>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={sendAllOverdue} disabled={bulkSending || open.length === 0} className="h-8">
              {bulkSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline ml-1">Remind all</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportAgingCSV(open)} disabled={open.length === 0} className="h-8" title="Export CSV">
              <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline ml-1">CSV</span>
            </Button>
            <Button size="sm" variant="outline" onClick={exportPDF} disabled={exporting || open.length === 0} className="h-8" title="Export PDF">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline ml-1">PDF</span>
            </Button>
          </div>
        </div>

        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">All caught up — no outstanding invoices.</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {open.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(i => {
                const bucket = ageBucket(i.due_date);
                const out = Number(i.total_amount) - Number(i.paid_amount);
                return (
                  <div key={i.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{i.customer_name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{i.invoice_number}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold">{formatINR(out)}</div>
                        <Badge variant={bucket === "60+" ? "destructive" : "outline"} className="text-[10px]">{bucket}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Due {new Date(i.due_date).toLocaleDateString("en-IN")}</span>
                      <span>{i.reminder_count > 0 ? `${i.reminder_count} reminder(s)` : "No reminders"}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => sendEmail(i)} className="h-8 flex-1" disabled={!i.customer_email}>
                        <Mail className="w-3.5 h-3.5 mr-1" /> Email
                      </Button>
                      <Button size="sm" variant="outline" asChild className="h-8 flex-1">
                        <a href={buildWhatsAppLink(i.customer_phone, reminderMessage(i))} target="_blank" rel="noreferrer">
                          <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-2">Invoice</th>
                    <th className="text-left py-2 px-2">Customer</th>
                    <th className="text-left py-2 px-2">Due</th>
                    <th className="text-left py-2 px-2">Bucket</th>
                    <th className="text-right py-2 px-2">Outstanding</th>
                    <th className="text-center py-2 px-2">Reminders</th>
                    <th className="text-center py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {open.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(i => {
                    const bucket = ageBucket(i.due_date);
                    const out = Number(i.total_amount) - Number(i.paid_amount);
                    return (
                      <tr key={i.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2 font-mono text-xs">{i.invoice_number}</td>
                        <td className="py-2 px-2">
                          <div className="font-medium">{i.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{i.customer_phone}</div>
                        </td>
                        <td className="py-2 px-2 text-xs">{new Date(i.due_date).toLocaleDateString("en-IN")}</td>
                        <td className="py-2 px-2"><Badge variant={bucket === "60+" ? "destructive" : "outline"}>{bucket}</Badge></td>
                        <td className="py-2 px-2 text-right font-semibold">{formatINR(out)}</td>
                        <td className="py-2 px-2 text-center text-xs">{i.reminder_count}{i.last_reminder_at && ` · ${new Date(i.last_reminder_at).toLocaleDateString("en-IN")}`}</td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="outline" onClick={() => sendEmail(i)} title="Email reminder"><Mail className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="outline" asChild title="WhatsApp reminder">
                              <a href={buildWhatsAppLink(i.customer_phone, reminderMessage(i))} target="_blank" rel="noreferrer"><MessageCircle className="w-3.5 h-3.5" /></a>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
