import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Database, Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const ENTITIES: { key: "leads" | "quotations" | "invoices" | "payments" | "expenses"; label: string; dateCol: string }[] = [
  { key: "leads", label: "Leads", dateCol: "created_at" },
  { key: "quotations", label: "Quotations", dateCol: "created_at" },
  { key: "invoices", label: "Invoices", dateCol: "issue_date" },
  { key: "payments", label: "Payments", dateCol: "paid_on" },
  { key: "expenses", label: "Expenses", dateCol: "expense_date" },
];

export default function DataExportPanel() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  const exportEntity = async (e: typeof ENTITIES[number]) => {
    setBusy(e.key);
    let q = supabase.from(e.key as any).select("*");
    if (from) q = q.gte(e.dateCol, from);
    if (to) q = q.lte(e.dateCol, to);
    const { data, error } = await q;
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    if (!data || !data.length) { toast.info("No rows in selected range"); return; }
    download(`${e.key}-${new Date().toISOString().slice(0,10)}.csv`, toCsv(data as any[]));
    toast.success(`Exported ${data.length} ${e.label.toLowerCase()}`);
  };

  const exportAll = async () => {
    setBusy("__all__");
    const zip = new JSZip();
    let totalRows = 0;
    let firstError: string | null = null;
    for (const e of ENTITIES) {
      let q = supabase.from(e.key as any).select("*");
      if (from) q = q.gte(e.dateCol, from);
      if (to) q = q.lte(e.dateCol, to);
      const { data, error } = await q;
      if (error) { firstError = firstError ?? `${e.label}: ${error.message}`; continue; }
      const csv = toCsv((data ?? []) as any[]);
      zip.file(`${e.key}.csv`, csv);
      totalRows += data?.length ?? 0;
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `chirpeel-export-${new Date().toISOString().slice(0,10)}.zip`; a.click();
    URL.revokeObjectURL(url);
    setBusy(null);
    if (firstError) toast.warning(`Exported ${totalRows} rows with errors`, { description: firstError });
    else toast.success(`Exported ${totalRows} rows across ${ENTITIES.length} files`);
  };

  return (
    <Card className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <Database className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Data Export</h3>
      </div>
      <p className="text-xs text-muted-foreground">Download your data as CSV. Optional date range filters by record date.</p>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div>
          <Label>From</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-sm flex items-center gap-2"><Archive className="w-4 h-4 text-primary" /> Full backup (ZIP)</div>
          <div className="text-xs text-muted-foreground mt-0.5">Downloads every entity as separate CSV files in one zip — perfect for offline backup or migration.</div>
        </div>
        <Button onClick={exportAll} disabled={busy === "__all__"} className="shrink-0">
          {busy === "__all__" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
          Export ZIP
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ENTITIES.map(e => (
          <Button key={e.key} variant="outline" className="justify-between" onClick={() => exportEntity(e)} disabled={busy === e.key}>
            <span>Export {e.label}</span>
            <Download className="w-4 h-4" />
          </Button>
        ))}
      </div>
    </Card>
  );
}
