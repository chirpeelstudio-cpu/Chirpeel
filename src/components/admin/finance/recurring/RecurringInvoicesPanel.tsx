import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Pencil, Trash2, Pause, Play, Repeat } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EmptyState } from "../../shared/EmptyState";
import { formatINR } from "../types";
import type { QuotationLite } from "../types";
import type { RecurringTemplate } from "./types";
import { FREQUENCY_LABEL } from "./types";
import { RecurringTemplateDialog } from "./RecurringTemplateDialog";

interface Props {
  quotations: QuotationLite[];
  onInvoiceGenerated: () => void;
}

export function RecurringInvoicesPanel({ quotations, onInvoiceGenerated }: Props) {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTemplate | null>(null);
  const [running, setRunning] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("recurring_invoice_templates")
      .select("*")
      .order("active", { ascending: false })
      .order("next_run_date", { ascending: true });
    setTemplates((data ?? []) as RecurringTemplate[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const togglePause = async (t: RecurringTemplate) => {
    const { error } = await supabase.from("recurring_invoice_templates").update({ active: !t.active }).eq("id", t.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: t.active ? "Paused" : "Resumed" }); refresh(); }
  };

  const remove = async (t: RecurringTemplate) => {
    if (!confirm(`Delete recurring template for ${t.milestone_label}?`)) return;
    const { error } = await supabase.from("recurring_invoice_templates").delete().eq("id", t.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); refresh(); }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recurring-invoices", { body: {} });
      if (error) throw error;
      toast({ title: `Generated ${data?.generated ?? 0} invoice(s)` });
      refresh();
      onInvoiceGenerated();
    } catch (e) {
      toast({ title: "Run failed", description: (e as Error).message, variant: "destructive" });
    } finally { setRunning(false); }
  };

  const edit = (t: RecurringTemplate) => { setEditing(t); setOpen(true); };
  const create = () => { setEditing(null); setOpen(true); };

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Recurring Invoices</h3>
          <Badge variant="outline" className="text-[10px]">{templates.filter(t => t.active).length} active</Badge>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={runNow} disabled={running} className="h-8">
            <RefreshCw className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline ml-1">Run now</span>
          </Button>
          <Button size="sm" onClick={create} className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1" /> New
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
      ) : templates.length === 0 ? (
        <EmptyState
          asCard={false}
          icon={Repeat}
          title="No recurring invoices yet"
          description="Schedule invoices that auto-generate on a regular cadence."
          actionLabel="Create template"
          actionIcon={Plus}
          onAction={create}
        />
      ) : (
        <div className="space-y-2">
          {templates.map(t => {
            const quo = quotations.find(q => q.id === t.quotation_id);
            const isOverdue = t.active && new Date(t.next_run_date) <= new Date();
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-2 border rounded-lg p-2.5 hover:bg-muted/30">
                <div className="flex-1 min-w-[180px]">
                  <div className="text-sm font-medium truncate">
                    {quo?.customer_name ?? "—"} <span className="text-muted-foreground font-normal">· {quo?.quotation_number}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.milestone_label} · {formatINR(t.amount)} {t.gst_enabled && `+ ${t.gst_rate}% GST`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.active ? "default" : "outline"} className="text-[10px]">
                    {FREQUENCY_LABEL[t.frequency]}
                  </Badge>
                  <div className="text-xs">
                    Next: <span className={isOverdue ? "text-amber-600 font-semibold" : ""}>{new Date(t.next_run_date).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <Button size="sm" variant="ghost" onClick={() => togglePause(t)} title={t.active ? "Pause" : "Resume"} className="h-8 w-8 p-0">
                    {t.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => edit(t)} title="Edit" className="h-8 w-8 p-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t)} title="Delete" className="h-8 w-8 p-0 text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RecurringTemplateDialog
        open={open}
        onOpenChange={setOpen}
        quotations={quotations}
        template={editing}
        onSaved={refresh}
      />
    </Card>
  );
}
