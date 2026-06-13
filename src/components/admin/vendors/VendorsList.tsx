import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Truck, CheckCircle2, Layers, IndianRupee, Star, Phone, Mail, Pencil, Trash2, MoreVertical, Eye } from "lucide-react";
import { toast } from "sonner";
import { VENDOR_CATEGORIES, type Vendor, type PurchaseOrder } from "./types";
import { VendorFormDialog } from "./VendorFormDialog";
import { VendorDetailDrawer } from "./VendorDetailDrawer";
import { MobileActionSheet, type MobileSheetAction } from "../shared/MobileActionSheet";
import { EmptyState } from "../shared/EmptyState";
import { useLocalCache } from "@/hooks/useLocalCache";
import { useIsMobile } from "@/hooks/use-mobile";
import { showUndoToast } from "../shared/undoToast";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export function VendorsList() {
  const navigate = useNavigate();
  const { value: vendors, setValue: setVendors, hydratedFromCache: vendorsCached } =
    useLocalCache<Vendor[]>("vendors.list", []);
  const { value: pos, setValue: setPos, hydratedFromCache: posCached } =
    useLocalCache<PurchaseOrder[]>("purchase_orders.list", []);
  const [loading, setLoading] = useState(!(vendorsCached && posCached));
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [actionVendor, setActionVendor] = useState<Vendor | null>(null);
  const isMobile = useIsMobile();

  const fetchAll = async () => {
    if (!(vendorsCached && posCached)) setLoading(true);
    const [v, p] = await Promise.all([
      supabase.from("vendors" as any).select("*").is("deleted_at", null).order("name"),
      supabase.from("purchase_orders" as any).select("*").is("deleted_at", null),
    ]);
    setVendors((v.data ?? []) as unknown as Vendor[]);
    setPos((p.data ?? []) as unknown as PurchaseOrder[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Listen for FAB-triggered "Add" event from AdminDashboard
  useEffect(() => {
    const onAdd = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.view === "vendors") { setEditing(null); setDialogOpen(true); }
    };
    window.addEventListener("admin:add", onAdd);
    return () => window.removeEventListener("admin:add", onAdd);
  }, []);

  const spendByVendor = useMemo(() => {
    const m = new Map<string, number>();
    pos.forEach(po => m.set(po.vendor_id, (m.get(po.vendor_id) ?? 0) + Number(po.total_amount ?? 0)));
    return m;
  }, [pos]);

  const filtered = useMemo(() => vendors.filter(v => {
    if (search) {
      const q = search.toLowerCase();
      if (!v.name.toLowerCase().includes(q)
        && !(v.contact_person ?? "").toLowerCase().includes(q)
        && !(v.phone ?? "").includes(q)
        && !(v.email ?? "").toLowerCase().includes(q)) return false;
    }
    if (filterCategory !== "all" && v.category !== filterCategory) return false;
    if (filterActive === "active" && !v.active) return false;
    if (filterActive === "inactive" && v.active) return false;
    return true;
  }), [vendors, search, filterCategory, filterActive]);

  const totalSpend = pos.reduce((s, p) => s + Number(p.total_amount ?? 0), 0);
  const activeCount = vendors.filter(v => v.active).length;
  const categories = new Set(vendors.map(v => v.category));

  const handleDelete = async (v: Vendor) => {
    if (!isMobile && !window.confirm(`Move "${v.name}" to trash?\n\nYou can restore it later from the Trash panel.`)) return;

    const loadingId = toast.loading(`Moving "${v.name}" to trash…`);
    const { error } = await supabase.from("vendors" as any).update({ deleted_at: new Date().toISOString() }).eq("id", v.id);
    toast.dismiss(loadingId);
    if (error) { toast.error("Couldn't move vendor to trash", { description: error.message }); return; }
    fetchAll();

    showUndoToast({
      title: `Vendor "${v.name}" moved to trash`,
      seconds: 6,
      onUndo: async () => {
        const undoId = toast.loading(`Restoring "${v.name}"…`);
        const { error: undoErr } = await supabase.from("vendors" as any).update({ deleted_at: null }).eq("id", v.id);
        toast.dismiss(undoId);
        if (undoErr) toast.error("Couldn't restore vendor", { description: undoErr.message });
        else { toast.success("Vendor restored", { description: `"${v.name}" is back in your list.` }); fetchAll(); }
      },
    });
  };

  const buildVendorActions = (v: Vendor): MobileSheetAction[] => {
    const acts: MobileSheetAction[] = [
      { key: "view", label: "View details", icon: Eye, onSelect: () => setSelected(v) },
      { key: "edit", label: "Edit vendor", icon: Pencil, onSelect: () => { setEditing(v); setDialogOpen(true); } },
      { key: "log-expense", label: "Log Expense", icon: IndianRupee, onSelect: () => navigate(`/studio/finance?tab=expenses&action=log&vendor=${encodeURIComponent(v.name)}`) },
    ];
    if (v.phone) acts.push({ key: "call", label: `Call ${v.phone}`, icon: Phone, href: `tel:${v.phone}` });
    if (v.email) acts.push({ key: "email", label: `Email ${v.email}`, icon: Mail, href: `mailto:${v.email}` });
    acts.push({ key: "delete", label: "Move to Trash", icon: Trash2, variant: "destructive", onSelect: () => handleDelete(v) });
    return acts;
  };

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Truck}        label="Total Vendors"  value={vendors.length} />
        <KPI icon={CheckCircle2} label="Active"         value={activeCount} tone="emerald" />
        <KPI icon={Layers}       label="Categories"     value={categories.size} tone="blue" />
        <KPI icon={IndianRupee}  label="Total PO Spend" value={formatINR(totalSpend)} tone="amber" />
      </div>

      {/* Toolbar */}
      <Card className="p-3 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, contact, phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {VENDOR_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={v => setFilterActive(v as any)}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="sm:ml-auto w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1.5" /> Add Vendor
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
            icon={Truck}
            title={search || filterCategory !== "all" ? "No vendors match your filters" : "No vendors yet"}
            description={search || filterCategory !== "all" ? "Adjust the filters or add a new vendor." : "Add your first vendor to track POs and spend."}
            actionLabel="Add Vendor"
            actionIcon={Plus}
            onAction={() => { setEditing(null); setDialogOpen(true); }}
          />
        ) : filtered.map(v => {
          const cat = VENDOR_CATEGORIES.find(c => c.key === v.category)?.label ?? v.category;
          const spend = spendByVendor.get(v.id) ?? 0;
          return (
            <Card key={v.id} className="p-3 active:bg-muted/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setSelected(v)}>
                  <p className="text-sm font-semibold text-foreground truncate">{v.name}</p>
                  {v.contact_person && <p className="text-xs text-muted-foreground truncate">{v.contact_person}</p>}
                </button>
                <Button
                  variant="ghost" size="icon" className="h-9 w-9 shrink-0 -mr-1"
                  aria-label="Row actions"
                  onClick={(e) => { e.stopPropagation(); setActionVendor(v); }}
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <Badge variant="outline" className="text-[10px]">{cat}</Badge>
                {v.active
                  ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
                  : <Badge variant="outline" className="text-muted-foreground text-[10px]">Inactive</Badge>}
                <span className="inline-flex items-center gap-0.5 text-amber-600 font-medium text-[11px]">
                  <Star className="w-3 h-3 fill-current" /> {Number(v.rating ?? 0).toFixed(1)}
                </span>
                <span className="ml-auto font-medium text-foreground">{formatINR(spend)}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Rating</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-0">
                <EmptyState
                  asCard={false}
                  icon={Truck}
                  title={search || filterCategory !== "all" ? "No vendors match your filters" : "No vendors yet"}
                  description={search || filterCategory !== "all" ? "Adjust the filters or add a new vendor." : "Add your first vendor to track POs and spend."}
                  actionLabel="Add Vendor"
                  actionIcon={Plus}
                  onAction={() => { setEditing(null); setDialogOpen(true); }}
                />
              </TableCell></TableRow>
            ) : filtered.map(v => {
              const cat = VENDOR_CATEGORIES.find(c => c.key === v.category)?.label ?? v.category;
              const spend = spendByVendor.get(v.id) ?? 0;
              return (
                <TableRow key={v.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(v)}>
                  <TableCell>
                    <div className="font-medium text-foreground">{v.name}</div>
                    {v.contact_person && <div className="text-xs text-muted-foreground">{v.contact_person}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{cat}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs">
                      {v.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{v.phone}</span>}
                      {v.email && <span className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{v.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-0.5 text-amber-600 font-medium">
                      <Star className="w-3 h-3 fill-current" /> {Number(v.rating ?? 0).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatINR(spend)}</TableCell>
                  <TableCell className="text-center">
                    {v.active
                      ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" title="Log Expense" onClick={() => navigate(`/studio/finance?tab=expenses&action=log&vendor=${encodeURIComponent(v.name)}`)}>
                      <IndianRupee className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(v); setDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <VendorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vendor={editing}
        onSaved={() => { setDialogOpen(false); fetchAll(); }}
      />
      <VendorDetailDrawer
        vendor={selected}
        pos={pos.filter(p => p.vendor_id === selected?.id)}
        onClose={() => setSelected(null)}
        onEdit={(v) => { setSelected(null); setEditing(v); setDialogOpen(true); }}
      />

      <MobileActionSheet
        open={!!actionVendor}
        onOpenChange={(o) => !o && setActionVendor(null)}
        title={actionVendor?.name ?? ""}
        description={actionVendor?.contact_person || actionVendor?.phone || undefined}
        actions={actionVendor ? buildVendorActions(actionVendor) : []}
      />
    </div>
  );
}

function KPI({ icon: Icon, label, value, tone = "primary" }: { icon: any; label: string; value: any; tone?: string }) {
  const toneCls: Record<string,string> = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-700 bg-emerald-100",
    blue:    "text-blue-700 bg-blue-100",
    amber:   "text-amber-700 bg-amber-100",
  };
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${toneCls[tone] ?? toneCls.primary}`}><Icon className="w-4 h-4" /></div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-base font-semibold truncate">{value}</p>
      </div>
    </Card>
  );
}
