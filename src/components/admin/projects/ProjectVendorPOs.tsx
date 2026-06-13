import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PO_STATUSES, type PurchaseOrder, type Vendor } from "../vendors/types";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export function ProjectVendorPOs({ projectId }: { projectId: string }) {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Map<string, Vendor>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("purchase_orders" as any)
        .select("*").eq("project_id", projectId).is("deleted_at", null).order("po_date", { ascending: false });
      const list = (data ?? []) as unknown as PurchaseOrder[];
      setPos(list);
      const ids = Array.from(new Set(list.map(p => p.vendor_id)));
      if (ids.length) {
        const { data: v } = await supabase.from("vendors" as any).select("*").in("id", ids);
        setVendors(new Map(((v ?? []) as unknown as Vendor[]).map(x => [x.id, x])));
      }
      setLoading(false);
    })();
  }, [projectId]);

  const total = pos.reduce((s, p) => s + Number(p.total_amount ?? 0), 0);

  return (
    <div className="space-y-3">
      <Card className="p-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{pos.length} purchase orders</span>
        <span className="text-sm font-semibold">{formatINR(total)}</span>
      </Card>

      {loading ? <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        : pos.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No POs raised on this project. Use the Vendors → Purchase Orders tab to add one.</p>
        : (
          <div className="space-y-1.5">
            {pos.map(po => {
              const st = PO_STATUSES.find(s => s.key === po.status);
              const v = vendors.get(po.vendor_id);
              return (
                <Card key={po.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{po.po_number}</p>
                    <p className="text-xs text-muted-foreground">{v?.name ?? "Vendor"} · {new Date(po.po_date).toLocaleDateString("en-IN")}</p>
                    {po.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{po.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatINR(Number(po.total_amount))}</p>
                    <Badge variant="outline" className={`text-[10px] ${st?.cls ?? ""}`}>{st?.label ?? po.status}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}
