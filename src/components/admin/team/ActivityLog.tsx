import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, RefreshCw, User, FileText, IndianRupee, Receipt, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface Entry {
  id: string;
  actor: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  diff: any;
  created_at: string;
}

const ENTITY_ICON: Record<string, any> = {
  lead: User,
  quotation: FileText,
  invoice: Receipt,
  payment: IndianRupee,
  expense: Wallet,
};

export default function ActivityLog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [actorFilter, setActorFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actors, setActors] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    let q = supabase.from("activity_log" as any).select("*").order("created_at", { ascending: false }).limit(200);
    if (actorFilter !== "all") q = q.eq("actor", actorFilter);
    if (entityFilter !== "all") q = q.eq("entity_type", entityFilter);
    const { data } = await q;
    const list = (data ?? []) as unknown as Entry[];
    setEntries(list);
    if (actors.length === 0) {
      const set = new Set<string>();
      list.forEach(e => { if (e.actor) set.add(e.actor); });
      setActors(Array.from(set).sort());
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [actorFilter, entityFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Activity Log</h3>
        <div className="flex items-center gap-2">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              <SelectItem value="lead">Leads</SelectItem>
              <SelectItem value="quotation">Quotations</SelectItem>
              <SelectItem value="invoice">Invoices</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actorFilter} onValueChange={setActorFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Actor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              {actors.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      <Card className="divide-y">
        {loading ? (
          <div className="p-4 space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No activity yet.</div>
        ) : entries.map(e => {
          const Icon = ENTITY_ICON[e.entity_type] || History;
          const actionColor = e.action === "delete" ? "destructive" : e.action === "insert" ? "default" : "secondary";
          return (
            <div key={e.id} className="p-3 flex items-start gap-3 hover:bg-muted/40">
              <div className="p-2 rounded-md bg-muted/60"><Icon className="w-4 h-4 text-foreground" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={actionColor as any} className="text-[10px] uppercase">{e.action}</Badge>
                  <span className="text-sm font-medium text-foreground truncate">{e.summary}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {e.actor || "system"} · {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
