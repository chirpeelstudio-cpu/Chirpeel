import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Phone, Mail, MapPin, FileText, Pencil, Star } from "lucide-react";
import { VENDOR_CATEGORIES, PO_STATUSES, type Vendor, type PurchaseOrder } from "./types";

interface Props {
  vendor: Vendor | null;
  pos: PurchaseOrder[];
  onClose: () => void;
  onEdit: (v: Vendor) => void;
}

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export function VendorDetailDrawer({ vendor, pos, onClose, onEdit }: Props) {
  if (!vendor) return null;
  const cat = VENDOR_CATEGORIES.find(c => c.key === vendor.category)?.label ?? vendor.category;
  const totalSpend = pos.reduce((s, p) => s + Number(p.total_amount ?? 0), 0);

  return (
    <Sheet open={!!vendor} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-start justify-between gap-2">
            <div>
              <div>{vendor.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{cat}</Badge>
                {vendor.active
                  ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                  : <Badge variant="outline">Inactive</Badge>}
                <span className="inline-flex items-center gap-0.5 text-amber-600 text-sm font-medium">
                  <Star className="w-3 h-3 fill-current" /> {Number(vendor.rating ?? 0).toFixed(1)}
                </span>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onEdit(vendor)}>
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Contact */}
          <Card className="p-3 space-y-1.5 text-sm">
            {vendor.contact_person && <div className="font-medium">{vendor.contact_person}</div>}
            {vendor.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{vendor.phone}</div>}
            {vendor.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" />{vendor.email}</div>}
            {vendor.address && <div className="flex items-start gap-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5 mt-0.5" />{vendor.address}</div>}
            {vendor.gstin && <div className="flex items-center gap-2 text-muted-foreground"><FileText className="w-3.5 h-3.5" />GSTIN: {vendor.gstin}</div>}
            {vendor.payment_terms && <div className="text-xs text-muted-foreground">Terms: {vendor.payment_terms}</div>}
          </Card>

          {/* Spend */}
          <Card className="p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total PO Spend</p>
            <p className="text-2xl font-bold">{formatINR(totalSpend)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pos.length} purchase orders</p>
          </Card>

          {/* Recent POs */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Recent Purchase Orders</h4>
            {pos.length === 0 ? (
              <p className="text-xs text-muted-foreground">No POs raised yet.</p>
            ) : (
              <div className="space-y-1.5">
                {pos.slice(0, 8).map(po => {
                  const st = PO_STATUSES.find(s => s.key === po.status);
                  return (
                    <div key={po.id} className="flex items-center justify-between text-xs border rounded-md p-2">
                      <div>
                        <div className="font-medium">{po.po_number}</div>
                        <div className="text-muted-foreground">{new Date(po.po_date).toLocaleDateString("en-IN")}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatINR(Number(po.total_amount))}</div>
                        <Badge className={`text-[10px] ${st?.cls ?? ""}`} variant="outline">{st?.label ?? po.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {vendor.notes && (
            <Card className="p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
