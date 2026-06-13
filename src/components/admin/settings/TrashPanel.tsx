import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type EntityKey = "lead" | "quotation" | "invoice" | "payment" | "expense";

const TABLES: Record<EntityKey, { table: string; label: (r: any) => string }> = {
  lead: { table: "leads", label: r => r.name || "—" },
  quotation: { table: "quotations", label: r => r.quotation_number || r.customer_name || "—" },
  invoice: { table: "invoices", label: r => r.invoice_number || r.customer_name || "—" },
  payment: { table: "payments", label: r => `₹${r.amount} · ${r.mode}` },
  expense: { table: "expenses", label: r => `${r.category} · ₹${r.amount}` },
};

function TrashList({ entity }: { entity: EntityKey }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(TABLES[entity].table as any).select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [entity]);

  const restore = async (id: string) => {
    const { error } = await supabase.rpc("restore_entity" as any, { _entity: entity, _id: id });
    if (error) toast.error(error.message); else { toast.success("Restored"); load(); }
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground p-4">Nothing in trash.</p>;

  return (
    <div className="divide-y">
      {rows.map(r => (
        <div key={r.id} className="flex items-center justify-between p-3 hover:bg-muted/40">
          <div className="min-w-0">
            <p className="font-medium truncate">{TABLES[entity].label(r)}</p>
            <p className="text-xs text-muted-foreground">Deleted {format(new Date(r.deleted_at), "MMM d, h:mm a")}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => restore(r.id)}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" />Restore
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function TrashPanel() {
  return (
    <Card>
      <div className="p-4 border-b flex items-center gap-2">
        <Trash2 className="w-4 h-4 text-primary" />
        <h3 className="text-lg font-semibold">Recently Deleted</h3>
      </div>
      <Tabs defaultValue="lead">
        <TabsList className="mx-4 mt-3">
          <TabsTrigger value="lead">Leads</TabsTrigger>
          <TabsTrigger value="quotation">Quotations</TabsTrigger>
          <TabsTrigger value="invoice">Invoices</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
        </TabsList>
        {(["lead", "quotation", "invoice", "payment", "expense"] as EntityKey[]).map(e => (
          <TabsContent key={e} value={e}><TrashList entity={e} /></TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
