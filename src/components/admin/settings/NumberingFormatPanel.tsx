import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hash, Save } from "lucide-react";
import { toast } from "sonner";

function preview(format: string) {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fy = `${String(y).slice(-2)}-${String(y + 1).slice(-2)}`;
  return format
    .replace(/\{FY\}/g, fy)
    .replace(/\{YYYY\}/g, String(now.getFullYear()))
    .replace(/\{YY\}/g, String(now.getFullYear()).slice(-2))
    .replace(/\{MM\}/g, String(now.getMonth() + 1).padStart(2, "0"))
    .replace(/\{SEQ:(\d+)\}/g, (_, n) => "1".padStart(Number(n), "0"))
    .replace(/\{SEQ\}/g, "1");
}

export default function NumberingFormatPanel() {
  const [row, setRow] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("app_settings").select("*").limit(1).maybeSingle();
    setRow(data);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!row?.id) return;
    setSaving(true);
    const { error } = await supabase.from("app_settings").update({
      invoice_number_format: row.invoice_number_format,
      quotation_number_format: row.quotation_number_format,
    } as any).eq("id", row.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Number formats saved");
  };

  if (!row) return <Card className="p-6">Loading…</Card>;

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Hash className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Document Numbering</h3>
          <p className="text-xs text-muted-foreground">
            Tokens: <code>{"{FY}"}</code>, <code>{"{YYYY}"}</code>, <code>{"{YY}"}</code>, <code>{"{MM}"}</code>, <code>{"{SEQ:0000}"}</code>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Quotation number format</Label>
          <Input value={row.quotation_number_format ?? ""} onChange={e => setRow({ ...row, quotation_number_format: e.target.value })} />
          <p className="text-xs text-muted-foreground">Preview: <span className="font-mono">{preview(row.quotation_number_format ?? "")}</span></p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Invoice number format</Label>
          <Input value={row.invoice_number_format ?? ""} onChange={e => setRow({ ...row, invoice_number_format: e.target.value })} />
          <p className="text-xs text-muted-foreground">Preview: <span className="font-mono">{preview(row.invoice_number_format ?? "")}</span></p>
        </div>
      </div>

      <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1.5" />{saving ? "Saving…" : "Save formats"}</Button>
    </Card>
  );
}
