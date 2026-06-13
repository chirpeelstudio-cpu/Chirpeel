import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { InboundLeadRow } from "./types";

export default function InboundLeadsPanel() {
  const [rows, setRows] = useState<InboundLeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("marketing_inbound_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setRows((data ?? []) as unknown as InboundLeadRow[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No social leads yet"
        description="Once you connect Meta or Google Ads and a lead form is submitted, raw webhook payloads will appear here for debugging."
      />
    );
  }

  return (
    <div className="space-y-2">
      {rows.map(r => (
        <Card key={r.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{r.channel_type}</Badge>
              {r.campaign_name && <span className="text-xs text-muted-foreground">{r.campaign_name}</span>}
              {r.processed_at ? (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-[10px]">Pushed to pipeline</Badge>
              ) : r.error ? (
                <Badge variant="destructive" className="text-[10px]">Error</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Pending</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}