import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ExternalLink, MessageCircle, Mail, History, Loader2 } from "lucide-react";
import type { QuotationSendHistoryEntry } from "./types";

interface Props {
  quotationId: string;
  refreshKey?: number;
}

export const SendHistory = ({ quotationId, refreshKey }: Props) => {
  const [rows, setRows] = useState<QuotationSendHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!quotationId) return;
    setLoading(true);
    supabase
      .from("quotation_send_history" as never)
      .select("*")
      .eq("quotation_id", quotationId)
      .order("sent_at", { ascending: false })
      .then(({ data }) => {
        setRows((data ?? []) as unknown as QuotationSendHistoryEntry[]);
        setLoading(false);
      });
  }, [quotationId, refreshKey]);

  return (
    <Card className="p-3">
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="group flex w-full items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Send History</span>
            <Badge variant="secondary" className="h-5 text-[10px]">{rows.length}</Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          {loading ? (
            <div className="flex items-center text-xs text-muted-foreground py-3">
              <Loader2 className="w-3 h-3 animate-spin mr-1" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Not sent yet.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="border border-border rounded-md p-2 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.is_revision ? "default" : "secondary"} className="text-[10px]">
                        {r.is_revision ? `Revision v${r.version}` : `Original v${r.version}`}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(r.sent_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        {r.channel === "email" ? <Mail className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
                        {r.channel}
                      </span>
                    </div>
                    {r.pdf_url && (
                      <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline"
                      >
                        PDF <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                  {r.sent_by && <div className="text-muted-foreground">By: {r.sent_by}</div>}
                  {r.note && (
                    <div className="bg-muted/40 rounded px-2 py-1 text-foreground">
                      <span className="font-medium">What changed: </span>{r.note}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
