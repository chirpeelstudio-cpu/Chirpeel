import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Star, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { BOQ_CATEGORIES, BOQ_UNITS, type BoqCategory, type BoqProduct, type BoqProductVendor } from "../projects/boq-types";
import type { Vendor } from "../vendors/types";

export default function BOQCatalogPanel() {
  const [active, setActive] = useState<BoqCategory>("wood");
  const [products, setProducts] = useState<BoqProduct[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [links, setLinks] = useState<BoqProductVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("nos");
  const [newRate, setNewRate] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: prods }, { data: vs }, { data: ls }] = await Promise.all([
      supabase.from("boq_products" as any).select("*").order("category").order("sort_order"),
      supabase.from("vendors" as any).select("*").eq("active", true),
      supabase.from("boq_product_vendors" as any).select("*"),
    ]);
    setProducts(((prods as any) ?? []) as BoqProduct[]);
    setVendors(((vs as any) ?? []) as Vendor[]);
    setLinks(((ls as any) ?? []) as BoqProductVendor[]);
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  const catProducts = useMemo(() => products.filter(p => p.category === active), [products, active]);
  const eligibleVendors = useMemo(() => {
    const cats = BOQ_CATEGORIES.find(c => c.key === active)?.vendorCategories ?? [];
    return vendors.filter(v => cats.includes(v.category));
  }, [vendors, active]);

  const addProduct = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("boq_products" as any).insert({
      category: active, name: newName.trim(), unit: newUnit, default_rate: Number(newRate) || 0,
    });
    if (error) toast.error(error.message);
    else { setNewName(""); setNewRate(""); fetchAll(); }
  };

  const updateProduct = async (id: string, patch: Partial<BoqProduct>) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...patch } : p));
    const { error } = await supabase.from("boq_products" as any).update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const removeProduct = async (id: string) => {
    if (!confirm("Delete product?")) return;
    const { error } = await supabase.from("boq_products" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else fetchAll();
  };

  const toggleVendorLink = async (productId: string, vendorId: string) => {
    const existing = links.find(l => l.boq_product_id === productId && l.vendor_id === vendorId);
    if (existing) {
      await supabase.from("boq_product_vendors" as any).delete().eq("id", existing.id);
    } else {
      await supabase.from("boq_product_vendors" as any).insert({ boq_product_id: productId, vendor_id: vendorId });
    }
    fetchAll();
  };

  const togglePreferred = async (linkId: string, current: boolean) => {
    await supabase.from("boq_product_vendors" as any).update({ is_preferred: !current }).eq("id", linkId);
    fetchAll();
  };

  if (loading) return <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>;

  return (
    <div className="space-y-3">
      <Tabs value={active} onValueChange={v => setActive(v as BoqCategory)}>
        <TabsList className="flex-wrap h-auto">
          {BOQ_CATEGORIES.map(c => <TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>)}
        </TabsList>
        {BOQ_CATEGORIES.map(c => (
          <TabsContent key={c.key} value={c.key} className="mt-3 space-y-2">
            <Card className="p-3 grid grid-cols-12 gap-2">
              <Input className="col-span-5" placeholder="Product name" value={newName} onChange={e => setNewName(e.target.value)} />
              <Select value={newUnit} onValueChange={setNewUnit}>
                <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>{BOQ_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="col-span-3" type="number" placeholder="Default rate ₹" value={newRate} onChange={e => setNewRate(e.target.value)} />
              <Button className="col-span-2" onClick={addProduct} disabled={!newName.trim()}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
            </Card>

            {catProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No products yet.</p>
            ) : (
              <div className="space-y-1.5">
                {catProducts.map(p => {
                  const open = expanded === p.id;
                  const productLinks = links.filter(l => l.boq_product_id === p.id);
                  return (
                    <Card key={p.id} className="p-2">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <Button size="icon" variant="ghost" className="col-span-1 h-8 w-8" onClick={() => setExpanded(open ? null : p.id)}>
                          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </Button>
                        <Input className="col-span-4 h-8" value={p.name} onChange={e => updateProduct(p.id, { name: e.target.value })} />
                        <Select value={p.unit} onValueChange={u => updateProduct(p.id, { unit: u })}>
                          <SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{BOQ_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input className="col-span-2 h-8" type="number" value={p.default_rate}
                          onChange={e => updateProduct(p.id, { default_rate: Number(e.target.value) })} />
                        <Badge variant="outline" className="col-span-2 text-[10px] justify-center">{productLinks.length} vendors</Badge>
                        <Button size="icon" variant="ghost" className="col-span-1 h-8 w-8" onClick={() => removeProduct(p.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </Button>
                      </div>
                      {open && (
                        <div className="mt-2 pl-9 space-y-1 border-t pt-2">
                          <p className="text-[11px] text-muted-foreground mb-1">Linked vendors (click to toggle, star = preferred)</p>
                          {eligibleVendors.length === 0 && <p className="text-[11px] text-muted-foreground">No active vendors in matching categories.</p>}
                          <div className="flex flex-wrap gap-1">
                            {eligibleVendors.map(v => {
                              const link = productLinks.find(l => l.vendor_id === v.id);
                              const isLinked = !!link;
                              return (
                                <div key={v.id} className="inline-flex items-center gap-1">
                                  <Button size="sm" variant={isLinked ? "default" : "outline"} className="h-7 text-[11px]"
                                    onClick={() => toggleVendorLink(p.id, v.id)}>
                                    {v.name}
                                  </Button>
                                  {link && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7"
                                      onClick={() => togglePreferred(link.id, link.is_preferred)}>
                                      <Star className={`w-3 h-3 ${link.is_preferred ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
