import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, FileText, MoreHorizontal, MessageCircle, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  BOQ_CATEGORIES, type BoqCategory, type BoqProduct, type BoqProductVendor, type ProjectBoqItem,
} from "./boq-types";
import type { Vendor, PurchaseOrder } from "../vendors/types";
import { buildPOMessage, formatINR, groupItemsForPO, openWhatsApp, validateWhatsAppPhone, vendorLabel } from "./boq-utils";
import type { Project } from "./types";

interface Props { project: Project }

export function ProjectBOQ({ project }: Props) {
  const [products, setProducts] = useState<BoqProduct[]>([]);
  const [productVendors, setProductVendors] = useState<BoqProductVendor[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<ProjectBoqItem[]>([]);
  const [companyName, setCompanyName] = useState("Our Company");
  const [paymentTerms, setPaymentTerms] = useState<string | null>(null);
  const [companyContact, setCompanyContact] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingPo, setSendingPo] = useState<string | null>(null);
  const [pos, setPos] = useState<Map<string, PurchaseOrder>>(new Map());
  const [waPreview, setWaPreview] = useState<{ poId: string; phone: string; vendorName: string; text: string } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: prods }, { data: pv }, { data: vs }, { data: its }, { data: comp }] = await Promise.all([
      supabase.from("boq_products" as any).select("*").eq("active", true).order("category").order("sort_order"),
      supabase.from("boq_product_vendors" as any).select("*"),
      supabase.from("vendors" as any).select("*").eq("active", true),
      supabase.from("project_boq_items" as any).select("*").eq("project_id", project.id).order("sort_order"),
      supabase.from("company_settings" as any).select("company_name, phone, email, whatsapp").limit(1).maybeSingle(),
    ]);
    setProducts((prods ?? []) as unknown as BoqProduct[]);
    setProductVendors((pv ?? []) as unknown as BoqProductVendor[]);
    setVendors((vs ?? []) as unknown as Vendor[]);
    setItems(((its as any) ?? []) as ProjectBoqItem[]);
    if (comp) {
      setCompanyName((comp as any).company_name ?? "Our Company");
      setCompanyContact((comp as any).phone ?? (comp as any).whatsapp ?? null);
    }
    // Fetch any POs already linked from items
    const poIds = Array.from(new Set((((its as any) ?? []) as ProjectBoqItem[]).map(i => i.po_id).filter(Boolean))) as string[];
    if (poIds.length) {
      const { data: poRows } = await supabase.from("purchase_orders" as any).select("*").in("id", poIds);
      setPos(new Map(((poRows ?? []) as unknown as PurchaseOrder[]).map(p => [p.id, p])));
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);

  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const vendorById = useMemo(() => new Map(vendors.map(v => [v.id, v])), [vendors]);

  const vendorsForProduct = (productId: string | null): Vendor[] => {
    if (!productId) return [];
    const links = productVendors.filter(l => l.boq_product_id === productId);
    if (!links.length) {
      // Fallback: vendors in matching category
      const prod = productById.get(productId);
      if (!prod) return [];
      const cats = BOQ_CATEGORIES.find(c => c.key === prod.category)?.vendorCategories ?? [];
      return vendors.filter(v => cats.includes(v.category));
    }
    const sorted = [...links].sort((a, b) => Number(b.is_preferred) - Number(a.is_preferred));
    return sorted.map(l => vendorById.get(l.vendor_id)).filter(Boolean) as Vendor[];
  };

  const itemsByCategory = useMemo(() => {
    const map = new Map<BoqCategory, ProjectBoqItem[]>();
    BOQ_CATEGORIES.forEach(c => map.set(c.key, []));
    items.forEach(i => map.get(i.category as BoqCategory)?.push(i));
    return map;
  }, [items]);

  const grandTotal = items.reduce((s, i) => s + Number(i.total ?? 0), 0);

  // ---------- Add row ----------
  const addItem = async (category: BoqCategory, productId: string, qty: number) => {
    const prod = productById.get(productId);
    if (!prod || qty <= 0) return;
    const rate = Number(prod.default_rate ?? 0);
    const total = qty * rate;
    const { error } = await supabase.from("project_boq_items" as any).insert({
      project_id: project.id, boq_product_id: prod.id, category,
      item_name: prod.name, unit: prod.unit, quantity: qty, rate, total,
    });
    if (error) toast.error(error.message); else fetchAll();
  };

  const updateItem = async (id: string, patch: Partial<ProjectBoqItem>) => {
    const local = items.find(i => i.id === id);
    if (!local) return;
    const merged = { ...local, ...patch };
    if (patch.quantity !== undefined || patch.rate !== undefined) {
      merged.total = Number(merged.quantity || 0) * Number(merged.rate || 0);
    }
    setItems(items.map(i => i.id === id ? merged : i));
    const update: any = { ...patch };
    if (patch.quantity !== undefined || patch.rate !== undefined) update.total = merged.total;
    const { error } = await supabase.from("project_boq_items" as any).update(update).eq("id", id);
    if (error) toast.error(error.message);
  };

  const setItemVendor = async (id: string, vendorId: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    // If vendor has a unit_rate override, apply it.
    const link = productVendors.find(l => l.boq_product_id === item.boq_product_id && l.vendor_id === vendorId);
    const patch: Partial<ProjectBoqItem> = { vendor_id: vendorId };
    if (link?.unit_rate != null) patch.rate = Number(link.unit_rate);
    await updateItem(id, patch);
  };

  const removeItem = async (id: string) => {
    if (!confirm("Remove this item from BOQ?")) return;
    const { error } = await supabase.from("project_boq_items" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else fetchAll();
  };

  // ---------- Generate POs by vendor ----------
  const generatePOs = async () => {
    const grouped = groupItemsForPO(items);
    if (grouped.size === 0) {
      toast.info("Assign a vendor and quantity to BOQ rows first.");
      return;
    }
    setGenerating(true);
    let created = 0;
    for (const [vendorId, rows] of grouped) {
      const vendor = vendorById.get(vendorId);
      if (!vendor) continue;
      const subtotal = rows.reduce((s, r) => s + Number(r.total), 0);
      const gst = Math.round(subtotal * 0.18);
      const description = rows.map(r =>
        `• ${r.item_name} — ${r.quantity} ${r.unit} × ₹${Number(r.rate).toLocaleString("en-IN")} = ₹${Number(r.total).toLocaleString("en-IN")}`
      ).join("\n");
      const { data: po, error } = await supabase.from("purchase_orders" as any).insert({
        vendor_id: vendorId, project_id: project.id,
        po_date: new Date().toISOString().slice(0, 10),
        amount: subtotal, gst_amount: gst, total_amount: subtotal + gst,
        status: "draft", description: `BOQ items for ${project.name}:\n${description}`,
      }).select("*").single();
      if (error || !po) { toast.error(`Failed for ${vendor.name}: ${error?.message ?? ""}`); continue; }
      const newPo = po as unknown as PurchaseOrder;
      await supabase.from("project_boq_items" as any).update({ po_id: newPo.id }).in("id", rows.map(r => r.id));
      created++;
    }
    setGenerating(false);
    if (created) {
      toast.success(`${created} purchase order${created > 1 ? "s" : ""} created`);
      fetchAll();
    }
  };

  // ---------- Send PO ----------
  const sendPOWhatsApp = (poId: string) => {
    const po = pos.get(poId);
    if (!po) return;
    const vendor = vendorById.get(po.vendor_id);
    const check = validateWhatsAppPhone(vendor?.phone);
    if (check.ok === false) {
      toast.error(`Can't send to ${vendor?.name ?? "vendor"}: ${check.error}`, {
        description: vendor?.phone ? `Stored number: ${vendor.phone}` : "Add a valid phone number on the vendor profile.",
      });
      return;
    }
    const _normalized = check.phone; // validated, ready for wa.me
    const rows = items.filter(i => i.po_id === poId).map(i => ({
      name: i.item_name, qty: Number(i.quantity), unit: i.unit, rate: Number(i.rate), total: Number(i.total),
    }));
    const text = buildPOMessage({
      companyName, poNumber: po.po_number, projectName: project.name, vendorName: vendor.name,
      items: rows, subtotal: Number(po.amount), gst: Number(po.gst_amount), total: Number(po.total_amount),
      paymentTerms: vendor.payment_terms, contact: companyContact,
    });
    setWaPreview({ poId, phone: vendor.phone, vendorName: vendor.name, text });
  };

  const confirmSendWhatsApp = async () => {
    if (!waPreview) return;
    const { poId, phone, text } = waPreview;
    const ok = openWhatsApp(phone, text);
    if (!ok) { toast.error("Invalid phone number."); return; }
    await supabase.from("vendor_po_dispatch_log" as any).insert({
      purchase_order_id: poId, channel: "whatsapp", recipient: phone, status: "opened",
    });
    const po = pos.get(poId);
    if (po && po.status === "draft") {
      await supabase.from("purchase_orders" as any).update({ status: "sent" }).eq("id", poId);
    }
    setWaPreview(null);
    toast.success("WhatsApp opened — review and send.");
    fetchAll();
  };

  const sendPOEmail = async (poId: string) => {
    setSendingPo(poId);
    const { data, error } = await supabase.functions.invoke("send-vendor-po", {
      body: { purchase_order_id: poId },
    });
    setSendingPo(null);
    if (error) {
      let msg = error.message;
      try {
        const ctx: any = (error as any).context;
        if (ctx?.json) { const j = await ctx.json(); if (j?.error) msg = j.error; }
      } catch { /* ignore */ }
      toast.error(msg);
      return;
    }
    toast.success((data as any)?.message ?? "PO emailed to vendor.");
    fetchAll();
  };

  if (loading) return <p className="text-xs text-muted-foreground text-center py-6">Loading BOQ…</p>;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <Card className="p-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{items.length} items across {BOQ_CATEGORIES.length} categories</p>
          <p className="text-lg font-semibold">{formatINR(grandTotal)}</p>
        </div>
        <Button size="sm" onClick={generatePOs} disabled={generating}>
          {generating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1" />}
          Generate POs by Vendor
        </Button>
      </Card>

      <Accordion type="multiple" defaultValue={BOQ_CATEGORIES.map(c => c.key)} className="space-y-2">
        {BOQ_CATEGORIES.map(cat => {
          const catItems = itemsByCategory.get(cat.key) ?? [];
          const catTotal = catItems.reduce((s, i) => s + Number(i.total), 0);
          const catProducts = products.filter(p => p.category === cat.key);
          return (
            <AccordionItem key={cat.key} value={cat.key} className="border rounded-md bg-card">
              <AccordionTrigger className="px-3 py-2 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-3">
                  <span className="font-medium text-sm">{cat.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{catItems.length} items</Badge>
                    <span className="text-sm font-semibold">{formatINR(catTotal)}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 space-y-2">
                <AddRow products={catProducts} onAdd={(pid, qty) => addItem(cat.key, pid, qty)} />

                {catItems.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-3">No items yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {catItems.map(it => {
                      const vList = vendorsForProduct(it.boq_product_id);
                      const po = it.po_id ? pos.get(it.po_id) : undefined;
                      return (
                        <div key={it.id} className="grid grid-cols-12 gap-2 items-center text-sm border rounded p-2">
                          <div className="col-span-12 sm:col-span-4 truncate">
                            <p className="font-medium truncate">{it.item_name}</p>
                            {po && <Badge variant="outline" className="text-[10px] mt-0.5">PO {po.po_number}</Badge>}
                          </div>
                          <Input type="number" className="col-span-3 sm:col-span-1 h-8" value={it.quantity}
                            disabled={!!it.po_id}
                            onChange={e => updateItem(it.id, { quantity: Number(e.target.value) })} />
                          <span className="col-span-1 text-[11px] text-muted-foreground">{it.unit}</span>
                          <Input type="number" className="col-span-3 sm:col-span-2 h-8" value={it.rate}
                            disabled={!!it.po_id}
                            onChange={e => updateItem(it.id, { rate: Number(e.target.value) })} />
                          <span className="col-span-2 sm:col-span-1 text-right font-semibold">{formatINR(Number(it.total))}</span>
                          <div className="col-span-9 sm:col-span-2">
                            <Select value={it.vendor_id ?? ""} onValueChange={v => setItemVendor(it.id, v)} disabled={!!it.po_id}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={vList.length ? "Pick vendor" : "No vendors"} /></SelectTrigger>
                              <SelectContent>
                                {vList.length === 0 && <SelectItem value="__none" disabled>No matching vendors</SelectItem>}
                                {vList.map(v => <SelectItem key={v.id} value={v.id}>{vendorLabel(v)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3 sm:col-span-1 flex justify-end gap-0.5">
                            {po && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8">
                                    {sendingPo === po.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreHorizontal className="w-3.5 h-3.5" />}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => sendPOWhatsApp(po.id)}>
                                    <MessageCircle className="w-3.5 h-3.5 mr-2" /> Send via WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => sendPOEmail(po.id)}>
                                    <Mail className="w-3.5 h-3.5 mr-2" /> Send via Email
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {!it.po_id && (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeItem(it.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Dialog open={!!waPreview} onOpenChange={(o) => !o && setWaPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview WhatsApp message</DialogTitle>
            <DialogDescription>
              Sending to {waPreview?.vendorName} ({waPreview?.phone}). You can edit before sending.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={waPreview?.text ?? ""}
            onChange={(e) => waPreview && setWaPreview({ ...waPreview, text: e.target.value })}
            className="min-h-[280px] font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaPreview(null)}>Cancel</Button>
            <Button onClick={confirmSendWhatsApp}>
              <MessageCircle className="w-3.5 h-3.5 mr-1" /> Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddRow({ products, onAdd }: { products: BoqProduct[]; onAdd: (productId: string, qty: number) => void }) {
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("");
  return (
    <div className="grid grid-cols-12 gap-2">
      <div className="col-span-7">
        <Select value={pid} onValueChange={setPid}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder={products.length ? "Select product…" : "No products in this category"} />
          </SelectTrigger>
          <SelectContent>
            {products.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.name} <span className="text-muted-foreground">· {p.unit} · ₹{Number(p.default_rate).toLocaleString("en-IN")}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input type="number" placeholder="Qty" className="col-span-3 h-9" value={qty} onChange={e => setQty(e.target.value)} />
      <Button className="col-span-2 h-9" disabled={!pid || !Number(qty)} onClick={() => { onAdd(pid, Number(qty)); setPid(""); setQty(""); }}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Add
      </Button>
    </div>
  );
}
