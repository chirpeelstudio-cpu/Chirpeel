import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, ExternalLink, Loader2, Send } from "lucide-react";
import { formatINR } from "@/components/admin/quotation/types";

interface Row {
  id: string;
  quotation_number: string;
  total_amount: number;
  status: "draft" | "sent" | "approved" | "rejected";
  created_at: string;
  pdf_url: string | null;
  payment_link_url: string | null;
  sent_at: string | null;
}

interface Props {
  leadId: string;
  onCreate: () => void;
  onOpen: (quotationId: string) => void;
}

const STATUS_COLOR: Record<Row["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

const LeadQuotationsSection = ({ leadId, onCreate, onOpen }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("quotations")
      .select("id, quotation_number, total_amount, status, created_at, pdf_url, payment_link_url, sent_at")
      .eq("lead_id", leadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setRows((data ?? []) as Row[]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [leadId]);

  const sentCount = rows.filter((r) => r.status === "sent" || r.status === "approved").length;
  const highest = rows.reduce((m, r) => Math.max(m, Number(r.total_amount) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1">
          <FileText className="w-4 h-4" /> Quotations
          {rows.length > 0 && (
            <span className="ml-1 text-[10px] font-medium bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
              {rows.length}
            </span>
          )}
        </h4>
        <Button size="sm" variant="outline" onClick={onCreate} className="h-7 text-xs gap-1">
          <Plus className="w-3.5 h-3.5" /> Create
        </Button>
      </div>

      {rows.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {rows.length} quotation{rows.length === 1 ? "" : "s"} · {sentCount} sent
          {highest > 0 ? ` · ${formatINR(highest)} highest` : ""}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          No quotations yet — create one to share with the client.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpen(r.id)}
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-primary truncate">{r.quotation_number}</span>
                  <Badge variant="outline" className={`text-[9px] capitalize ${STATUS_COLOR[r.status]}`}>
                    {r.status}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {fmt(r.created_at)}
                  {r.sent_at && (
                    <span className="inline-flex items-center gap-0.5 ml-1.5">
                      · <Send className="w-2.5 h-2.5 inline" /> {fmt(r.sent_at)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-semibold">{formatINR(Number(r.total_amount) || 0)}</div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeadQuotationsSection;