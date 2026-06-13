import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2, Pencil, MoreVertical, Receipt, Activity } from "lucide-react";
import { toast } from "sonner";
import { PO_STATUSES, type PurchaseOrder, type Vendor } from "./types";
import { PurchaseOrderFormDialog } from "./PurchaseOrderFormDialog";
import { POStatusTimeline } from "./POStatusTimeline";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MobileActionSheet, type MobileSheetAction } from "../shared/MobileActionSheet";
import { EmptyState } from "../shared/EmptyState";
import { useIsMobile } from "@/hooks/use-mobile";
import { showUndoToast } from "../shared/undoToast";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

interface ProjectLite { id: string; name: string; }

export function PurchaseOrdersList() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVendor, setFilterVendor] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [actionPO, setActionPO] = useState<PurchaseOrder | null>(null);
  const [timelinePO, setTimelinePO] = useState<PurchaseOrder | null>(null);
  const isMobile = useIsMobile();

  const fetchAll = async () => {
    setLoading(true);
    const [p, v, pr] = await Promise.all([
      supabase.from("purchase_orders" as any).select("*").is("deleted_at", null).order("po_date", { ascending: false }),
      supabase.from("vendors" as any).select("*").is("deleted_at", null).order("name"),
      supabase.from("projects" as any).select("id, name").is("deleted_at", null),
    ]);
    setPos((p.data ?? []) as unknown as PurchaseOrder[]);
    setVendors((v.data ?? []) as unknown as Vendor[]);
    setProjects((pr.data ?? []) as unknown as ProjectLite[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v])), [vendors]);
  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const filtered = useMemo(() => pos.filter(p => {
    if (search) {
      const q = search.toLowerCase();
      const vName = vendorMap.get(p.vendor_id)?.name ?? "";
      if (!p.po_number.toLowerCase().includes(q) && !vName.toLowerCase().includes(q)) return false;
    }
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterVendor !== "all" && p.vendor_id !== filterVendor) return false;
    return true;
  }), [pos, search, filterStatus, filterVendor, vendorMap]);

  const totals = useMemo(() => {
    const draft = filtered.filter(p => p.status === "draft").reduce((s, p) => s + Number(p.total_amount ?? 0), 0);
    const open = filtered.filter(p => ["sent","received"].includes(p.status)).reduce((s, p) => s + Number(p.total_amount ?? 0), 0);
    const paid = filtered.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.total_amount ?? 0), 0);
    return { draft, open, paid, all: filtered.reduce((s, p) => s + Number(p.total_amount ?? 0), 0) };
  }, [filtered]);

  const handleDelete = async (po: PurchaseOrder) => {
    if (!isMobile && !window.confirm(`Delete purchase order ${po.po_number}?\n\nYou can restore it later from the Trash panel.`)) return;

    const loadingId = toast.loading(`Deleting PO ${po.po_number}…`);
    const { error } = await supabase.from("purchase_orders" as any).update({ deleted_at: new Date().toISOString() }).eq("id", po.id);
    toast.dismiss(loadingId);
    if (error) { toast.error("Couldn't delete purchase order", { description: error.message }); return; }
    fetchAll();

    showUndoToast({
      title: `Purchase order ${po.po_number} deleted`,
      seconds: 6,
      onUndo: async () => {
        const undoId = toast.loading(`Restoring PO ${po.po_number}…`);
        const { error: undoErr } = await supabase.from("purchase_orders" as any).update({ deleted_at: null }).eq("id", po.id);
        toast.dismiss(undoId);
        if (undoErr) toast.error("Couldn't restore purchase order", { description: undoErr.message });
        else { toast.success("Purchase order restored", { description: `PO ${po.po_number} is back in your list.` }); fetchAll(); }
      },
    });
  };

  const buildPOActions = (po: PurchaseOrder): MobileSheetAction[] => [
    { key: "timeline", label: "Status timeline", icon: Activity, onSelect: () => { setActionPO(null); setTimelinePO(po); } },
    { key: "edit", label: "Edit PO", icon: Pencil, onSelect: () => { setEditing(po); setDialogOpen(true); } },
    { key: "delete", label: "Delete PO", icon: Trash2, variant: "destructive", onSelect: () => handleDelete(po) },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-[11px] uppercase text-muted-foreground">Total POs</p><p className="text-base font-semibold">{filtered.length} · {formatINR(totals.all)}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-muted-foreground">Draft</p><p className="text-base font-semibold text-slate-700">{formatINR(totals.draft)}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-muted-foreground">Open (Sent/Received)</p><p className="text-base font-semibold text-blue-700">{formatINR(totals.open)}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-muted-foreground">Paid</p><p className="text-base font-semibold text-emerald-700">{formatINR(totals.paid)}</p></Card>
      </div>

      <Card className="p-3 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search PO # or vendor…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <Select value={filterVendor} onValueChange={setFilterVendor}>
            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {PO_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="sm:ml-auto w-full sm:w-auto" disabled={vendors.length === 0}>
          <Plus className="w-4 h-4 mr-1.5" /> New PO
        </Button>
      </Card>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3"><div className="h-16 bg-muted rounded animate-pulse" /></Card>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={search || filterStatus !== "all" || filterVendor !== "all" ? "No POs match your filters" : "No purchase orders yet"}
            description={vendors.length === 0
              ? "Add a vendor first, then create your first purchase order."
              : "Create your first PO to track procurement and spend."}
            actionLabel={vendors.length === 0 ? undefined : "New PO"}
            actionIcon={Plus}
            onAction={vendors.length === 0 ? undefined : () => { setEditing(null); setDialogOpen(true); }}
          />
        ) : filtered.map(p => {
          const st = PO_STATUSES.find(s => s.key === p.status);
          return (
            <Card key={p.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="flex-1 min-w-0 text-left" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                  <p className="text-sm font-semibold text-foreground truncate">{p.po_number}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {vendorMap.get(p.vendor_id)?.name ?? "—"}
                    {p.project_id ? ` · ${projectMap.get(p.project_id)?.name ?? "—"}` : ""}
                  </p>
                </button>
                <Button
                  variant="ghost" size="icon" className="h-9 w-9 shrink-0 -mr-1"
                  aria-label="Row actions"
                  onClick={() => setActionPO(p)}
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">{new Date(p.po_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                <button type="button" onClick={() => setTimelinePO(p)}>
                  <Badge variant="outline" className={`text-[10px] ${st?.cls ?? ""} cursor-pointer`}>{st?.label ?? p.status}</Badge>
                </button>
                <span className="ml-auto font-semibold text-foreground">{formatINR(Number(p.total_amount))}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="py-0">
                <EmptyState
                  asCard={false}
                  icon={Receipt}
                  title={search || filterStatus !== "all" || filterVendor !== "all" ? "No POs match your filters" : "No purchase orders yet"}
                  description={vendors.length === 0
                    ? "Add a vendor first, then create your first purchase order."
                    : "Create your first PO to track procurement and spend."}
                  actionLabel={vendors.length === 0 ? undefined : "New PO"}
                  actionIcon={Plus}
                  onAction={vendors.length === 0 ? undefined : () => { setEditing(null); setDialogOpen(true); }}
                />
              </TableCell></TableRow>
            ) : filtered.map(p => {
              const st = PO_STATUSES.find(s => s.key === p.status);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.po_number}</TableCell>
                  <TableCell className="text-sm">{new Date(p.po_date).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell>{vendorMap.get(p.vendor_id)?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.project_id ? projectMap.get(p.project_id)?.name ?? "—" : "—"}</TableCell>
                  <TableCell className="text-right">{formatINR(Number(p.amount))}</TableCell>
                  <TableCell className="text-right">{formatINR(Number(p.gst_amount))}</TableCell>
                  <TableCell className="text-right font-semibold">{formatINR(Number(p.total_amount))}</TableCell>
                  <TableCell className="text-center">
                    <button type="button" onClick={() => setTimelinePO(p)} title="View / update status timeline">
                      <Badge variant="outline" className={`${st?.cls} cursor-pointer hover:opacity-80`}>{st?.label ?? p.status}</Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setTimelinePO(p)} title="Status timeline">
                      <Activity className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <PurchaseOrderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        po={editing}
        vendors={vendors}
        projects={projects}
        onSaved={() => { setDialogOpen(false); fetchAll(); }}
      />

      <MobileActionSheet
        open={!!actionPO}
        onOpenChange={(o) => !o && setActionPO(null)}
        title={actionPO?.po_number ?? ""}
        description={actionPO ? `${vendorMap.get(actionPO.vendor_id)?.name ?? "—"} · ${formatINR(Number(actionPO.total_amount))}` : undefined}
        actions={actionPO ? buildPOActions(actionPO) : []}
      />

      <Dialog open={!!timelinePO} onOpenChange={(o) => !o && setTimelinePO(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>PO {timelinePO?.po_number} — Status timeline</DialogTitle>
            <DialogDescription>
              {timelinePO ? `${vendorMap.get(timelinePO.vendor_id)?.name ?? "Vendor"} · ${formatINR(Number(timelinePO.total_amount))}` : ""}
            </DialogDescription>
          </DialogHeader>
          {timelinePO && (
            <POStatusTimeline
              po={timelinePO}
              onChanged={(next) => {
                setTimelinePO({ ...timelinePO, status: next });
                setPos(prev => prev.map(x => x.id === timelinePO.id ? { ...x, status: next } : x));
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
