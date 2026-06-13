import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Pencil, Trash2, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  BRAND_GROUPS,
  BRAND_CATEGORY_LABEL,
  type BrandCategory,
} from "@/components/admin/quotation/brands";
import { useAllBrands, type BrandCatalogRow } from "@/hooks/useBrandCatalog";
import { BrandFormDialog } from "./BrandFormDialog";

const STORAGE_KEY = "brands-panel-open";

interface DialogState {
  category: BrandCategory;
  brand: BrandCatalogRow | null;
}

export const BrandsPanel = () => {
  const { toast } = useToast();
  const { rows, loading, reload } = useAllBrands();
  const [panelOpen, setPanelOpen] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== "0"; } catch { return true; }
  });
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const togglePanel = (v: boolean) => {
    setPanelOpen(v);
    try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch { /* noop */ }
  };

  const byCat = useMemo(() => {
    const m: Record<string, BrandCatalogRow[]> = {};
    rows.forEach((r) => { (m[r.category] ||= []).push(r); });
    return m;
  }, [rows]);

  const toggleActive = async (b: BrandCatalogRow) => {
    const { error } = await supabase
      .from("brand_catalog" as never)
      .update({ active: !b.active } as never)
      .eq("id", b.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    reload();
  };

  const remove = async (b: BrandCatalogRow) => {
    if (b.is_preset) {
      toast({ title: "Preset brand", description: "Deactivate it instead of deleting.", variant: "destructive" });
      return;
    }
    if (!confirm(`Delete brand "${b.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("brand_catalog" as never).delete().eq("id", b.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Brand deleted" });
    reload();
  };

  return (
    <Collapsible open={panelOpen} onOpenChange={togglePanel} className="border border-border rounded-lg bg-card overflow-hidden">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", panelOpen && "rotate-180")} />
            <h2 className="text-sm font-bold tracking-wide uppercase text-foreground">Brands & Logos</h2>
            <span className="text-xs text-muted-foreground">({rows.length} brand{rows.length === 1 ? "" : "s"})</span>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">Add / edit / upload logos · sets ₹/sqft uplift</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="px-4 pb-4 pt-3 space-y-4 border-t border-border">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : (
            BRAND_GROUPS.map((group) => (
              <div key={group.key} className="space-y-3">
                <h3 className="text-xs uppercase tracking-wide font-bold text-muted-foreground">{group.label}</h3>
                {group.categories.map((cat) => {
                  const list = byCat[cat] ?? [];
                  const open = openCats[cat] ?? true;
                  const nextSort = list.length ? Math.max(...list.map((b) => b.sort_order)) + 1 : 1;
                  return (
                    <Collapsible
                      key={cat}
                      open={open}
                      onOpenChange={(v) => setOpenCats((s) => ({ ...s, [cat]: v }))}
                      className="border border-border rounded-md bg-background/50"
                    >
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="flex items-center gap-2 flex-1 text-left">
                            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
                            <span className="text-sm font-semibold">{BRAND_CATEGORY_LABEL[cat]}</span>
                            <span className="text-[11px] text-muted-foreground">({list.length})</span>
                          </button>
                        </CollapsibleTrigger>
                        <Button size="sm" variant="outline" onClick={() => setDialog({ category: cat, brand: null })}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add brand
                        </Button>
                      </div>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-1">
                          {list.length === 0 ? (
                            <p className="text-xs italic text-muted-foreground py-2">No brands yet — click "Add brand".</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {list.map((b) => (
                                <Card key={b.id} className={cn("p-3 flex items-center gap-3", !b.active && "opacity-60")}>
                                  <div className="h-12 w-12 shrink-0 bg-muted rounded flex items-center justify-center overflow-hidden">
                                    {b.logo_url ? (
                                      <img src={b.logo_url} alt={b.name} className="max-h-12 max-w-12 object-contain" />
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground text-center px-1">{b.name}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-semibold truncate">{b.name}</span>
                                      {b.is_preset && (
                                        <Badge variant="secondary" className="h-4 px-1 text-[9px] gap-0.5">
                                          <Lock className="w-2.5 h-2.5" /> preset
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">+₹{b.rate_per_sqft}/sqft</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <Switch checked={b.active} onCheckedChange={() => toggleActive(b)} />
                                    <div className="flex gap-0.5">
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ category: cat, brand: b })}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => remove(b)}
                                        disabled={b.is_preset}
                                        title={b.is_preset ? "Preset brand — deactivate instead" : "Delete brand"}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                      {dialog?.category === cat && (
                        <BrandFormDialog
                          open={!!dialog}
                          onOpenChange={(v) => { if (!v) setDialog(null); }}
                          category={cat}
                          brand={dialog.brand}
                          nextSortOrder={nextSort}
                          onSaved={reload}
                        />
                      )}
                    </Collapsible>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
