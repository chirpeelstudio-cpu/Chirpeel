import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  calcLineItemTotal,
  COMMERCIAL_PROJECT_TYPES,
  COMMERCIAL_UNIT_PRESETS,
  computeRateBreakdown,
  computeUnitRate,
  formatINR,
  inferCategoryKey,
  roomSlug,
  type ItemCategory,
  type MaterialPricingMatrix,
  type MaterialRoomOverrides,
  type PricingItem,
  type QuotationLineItem,
  type QuotationRoom,
  type RoomTypeKey,
} from "./types";

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  core_material: "Core Material",
  units: "Woodwork",
  accessories: "Accessories",
  painting: "Painting",
  electrical: "Electrical",
  false_ceiling: "False Ceiling",
};

const SHOWN_CATEGORIES: ItemCategory[] = ["units", "false_ceiling", "accessories", "painting", "electrical"];

const SHUTTER_FINISHES = ["Laminate", "Acrylic", "PU Paint", "Membrane"];

interface Props {
  room: QuotationRoom;
  catalog: PricingItem[];
  matrix: MaterialPricingMatrix | null;
  roomOverrides?: MaterialRoomOverrides | null;
  quotationBrands: { hardware: string | null; core: string | null; laminate: string | null };
  projectType?: string | null;
  /** When true, renders cost input + margin chip per line (admin/manager only). */
  showMargin?: boolean;
  onChange: (patch: Partial<QuotationRoom>) => void;
  onPickMaterialType?: (key: string) => void;
}

export const LineItemsSection = ({ room, catalog, matrix, roomOverrides, quotationBrands, projectType, showMargin, onChange, onPickMaterialType }: Props) => {
  const isCommercial = !!projectType && COMMERCIAL_PROJECT_TYPES.includes(projectType);
  const roomType: RoomTypeKey = room.room_type ?? "all";
  const rKey = roomSlug(room.room_name);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [pickedCatalog, setPickedCatalog] = useState<Set<string>>(new Set());
  const [pickedPresets, setPickedPresets] = useState<Set<string>>(new Set());
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const isSectionOpen = (cat: ItemCategory, hasItems: boolean) => {
    if (cat in openSections) return openSections[cat];
    return hasItems;
  };
  const toggleSection = (cat: ItemCategory, value: boolean) => {
    setOpenSections((prev) => ({ ...prev, [cat]: value }));
  };

  /** Compute per-line rate honouring per-room × per-category overrides. */
  const rateForLine = (li: QuotationLineItem) => {
    const catKey = inferCategoryKey(li.item_name);
    const rate = computeUnitRate(
      matrix,
      room.material_type_key,
      quotationBrands.hardware,
      quotationBrands.core,
      quotationBrands.laminate,
      room.shutter_finish_key,
      roomOverrides,
      rKey,
      catKey,
    );
    const bd = computeRateBreakdown(
      matrix,
      room.material_type_key,
      quotationBrands.hardware,
      quotationBrands.core,
      quotationBrands.laminate,
      room.shutter_finish_key,
      roomOverrides,
      rKey,
      catKey,
    );
    const title = `Material${bd.materialIsOverride ? ` (${room.room_name} · ${catKey})` : ""} ${bd.material} + Hardware ${bd.hardware} + Core ${bd.core} + Laminate ${bd.laminate} + Shutter ${bd.shutter} = ₹${rate.toFixed(0)}/sqft${bd.materialIsOverride ? " (override)" : ""}`;
    return { rate, title, isOverride: bd.materialIsOverride };
  };

  // Default room-level rate (no specific category) for the picker preview / fallback.
  const dynamicRate = computeUnitRate(matrix, room.material_type_key, quotationBrands.hardware, quotationBrands.core, quotationBrands.laminate, room.shutter_finish_key, roomOverrides, rKey, null);
  const breakdown = computeRateBreakdown(matrix, room.material_type_key, quotationBrands.hardware, quotationBrands.core, quotationBrands.laminate, room.shutter_finish_key, roomOverrides, rKey, null);
  const breakdownTitle = `Material ${breakdown.material} + Hardware ${breakdown.hardware} + Core ${breakdown.core} + Laminate ${breakdown.laminate} + Shutter ${breakdown.shutter} = ₹${dynamicRate.toFixed(0)}/sqft`;

  // catalog items relevant to this room (room match OR all)
  const filtered = useMemo(
    () => catalog.filter((c) => c.item_category && (c.room_type === roomType || c.room_type === "all")),
    [catalog, roomType],
  );

  const coreMaterials = useMemo(() => filtered.filter((c) => c.item_category === "core_material"), [filtered]);

  const itemsByCategory = useMemo(() => {
    const map: Record<ItemCategory, PricingItem[]> = {
      core_material: [], units: [], accessories: [], painting: [], electrical: [], false_ceiling: [],
    };
    filtered.forEach((c) => { if (c.item_category) map[c.item_category].push(c); });
    return map;
  }, [filtered]);

  const setCore = (id: string) => {
    const m = coreMaterials.find((x) => x.id === id);
    if (!m) return;
    // re-rate existing unit_sqft line items that follow core
    const next = (room.line_items ?? []).map((li) => {
      if (li.item_type === "unit_sqft") {
        const catalogItem = catalog.find((c) => c.id === li.catalog_id);
        const upliftRate = Number(catalogItem?.rate_per_sqft || 0);
        const rate = Number(m.rate_per_sqft) + upliftRate;
        const updated = { ...li, rate };
        updated.total_cost = calcLineItemTotal(updated);
        return updated;
      }
      return li;
    });
    onChange({
      core_material_id: m.id,
      core_material_name: m.name,
      core_material_rate: Number(m.rate_per_sqft),
      line_items: next,
    });
  };

  const addItem = (category: ItemCategory, catalogItem?: PricingItem) => {
    const tempId = crypto.randomUUID();
    let li: QuotationLineItem;
    if (category === "false_ceiling") {
      li = {
        tempId,
        catalog_id: null,
        item_name: "False Ceiling",
        item_category: "false_ceiling",
        item_type: "unit_sqft",
        width_ft: 0, height_ft: 0, area_sqft: 0,
        quantity: 1,
        rate: dynamicRate || room.core_material_rate || 0,
        pricing_mode: "sqft",
        total_cost: 0,
        notes: null,
        sort_order: (room.line_items?.length ?? 0),
      };
    } else if (category === "painting" || category === "electrical") {
      const isPainting = category === "painting";
      const presetRate = isPainting ? 35 : 0;
      li = {
        tempId,
        catalog_id: catalogItem?.id ?? null,
        item_name: catalogItem?.name ?? CATEGORY_LABELS[category],
        item_category: category,
        item_type: category,
        width_ft: 0, height_ft: 0, area_sqft: 0,
        quantity: 1,
        rate: presetRate,
        pricing_mode: presetRate > 0 ? "sqft" : "lumpsum",
        total_cost: 0,
        notes: null,
        sort_order: (room.line_items?.length ?? 0),
      };
    } else if (catalogItem?.item_type === "accessory_fixed") {
      li = {
        tempId,
        catalog_id: catalogItem.id,
        item_name: catalogItem.name,
        item_category: category,
        item_type: "accessory_fixed",
        width_ft: 0, height_ft: 0, area_sqft: 0,
        quantity: 1,
        rate: Number(catalogItem.fixed_cost),
        pricing_mode: "fixed",
        total_cost: Number(catalogItem.fixed_cost),
        notes: null,
        sort_order: (room.line_items?.length ?? 0),
      };
    } else {
      // unit_sqft — use dynamic matrix rate (falls back to legacy core+uplift if matrix unset)
      const uplift = Number(catalogItem?.rate_per_sqft || 0);
      const effective = dynamicRate > 0 ? dynamicRate : (room.core_material_rate || 0) + uplift;
      li = {
        tempId,
        catalog_id: catalogItem?.id ?? null,
        item_name: catalogItem?.name ?? "New unit",
        item_category: category,
        item_type: "unit_sqft",
        width_ft: 0, height_ft: 0, area_sqft: 0,
        quantity: 1,
        rate: effective,
        pricing_mode: "sqft",
        total_cost: 0,
        notes: null,
        sort_order: (room.line_items?.length ?? 0),
      };
    }
    onChange({ line_items: [...(room.line_items ?? []), li] });
  };

  const buildUnitLineItem = (sortBase: number, opts: { catalogItem?: PricingItem; presetName?: string }): QuotationLineItem => {
    const { catalogItem, presetName } = opts;
    const uplift = Number(catalogItem?.rate_per_sqft || 0);
    const effective = dynamicRate > 0 ? dynamicRate : (room.core_material_rate || 0) + uplift;
    if (catalogItem?.item_type === "accessory_fixed") {
      return {
        tempId: crypto.randomUUID(),
        catalog_id: catalogItem.id,
        item_name: catalogItem.name,
        item_category: "units",
        item_type: "accessory_fixed",
        width_ft: 0, height_ft: 0, area_sqft: 0,
        quantity: 1,
        rate: Number(catalogItem.fixed_cost),
        pricing_mode: "fixed",
        total_cost: Number(catalogItem.fixed_cost),
        notes: null,
        sort_order: sortBase,
      };
    }
    return {
      tempId: crypto.randomUUID(),
      catalog_id: catalogItem?.id ?? null,
      item_name: catalogItem?.name ?? presetName ?? "New unit",
      item_category: "units",
      item_type: "unit_sqft",
      width_ft: 0, height_ft: 0, area_sqft: 0,
      quantity: 1,
      rate: effective,
      pricing_mode: "sqft",
      total_cost: 0,
      notes: null,
      sort_order: sortBase,
    };
  };

  const addMultipleUnits = () => {
    const presets = itemsByCategory["units"];
    const existing = room.line_items ?? [];
    const base = existing.length;
    const newItems: QuotationLineItem[] = [];
    let i = 0;
    pickedCatalog.forEach((id) => {
      const ci = presets.find((p) => p.id === id);
      if (ci) newItems.push(buildUnitLineItem(base + i++, { catalogItem: ci }));
    });
    pickedPresets.forEach((name) => {
      newItems.push(buildUnitLineItem(base + i++, { presetName: name }));
    });
    if (newItems.length === 0) return;
    onChange({ line_items: [...existing, ...newItems] });
    setPickedCatalog(new Set());
    setPickedPresets(new Set());
    setUnitPickerOpen(false);
  };

  const togglePickedCatalog = (id: string) => {
    setPickedCatalog((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const togglePickedPreset = (name: string) => {
    setPickedPresets((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name); else n.add(name);
      return n;
    });
  };

  const updateItem = (tempId: string, patch: Partial<QuotationLineItem>) => {
    const next = (room.line_items ?? []).map((li) => {
      if (li.tempId !== tempId) return li;
      const merged = { ...li, ...patch };
      if (patch.width_ft !== undefined || patch.height_ft !== undefined) {
        merged.area_sqft = (merged.width_ft || 0) * (merged.height_ft || 0);
      }
      merged.total_cost = calcLineItemTotal(merged);
      return merged;
    });
    onChange({ line_items: next });
  };

  const removeItem = (tempId: string) => {
    onChange({ line_items: (room.line_items ?? []).filter((li) => li.tempId !== tempId) });
  };

  return (
    <div className="space-y-4 border-t border-border pt-4">
      {/* Categories */}
      {SHOWN_CATEGORIES.map((cat) => {
        const itemsHere = (room.line_items ?? []).filter((li) => li.item_category === cat);
        const presets = itemsByCategory[cat];
        const isService = cat === "painting" || cat === "electrical";
        const isFalseCeiling = cat === "false_ceiling";
        const sectionTotal = itemsHere.reduce((sum, li) => sum + (li.total_cost || 0), 0);
        const open = isSectionOpen(cat, itemsHere.length > 0);

        return (
          <Collapsible
            key={cat}
            open={open}
            onOpenChange={(v) => toggleSection(cat, v)}
            className="space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 flex-1 min-w-0 text-left group"
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wide group-hover:text-foreground transition-colors">
                    {CATEGORY_LABELS[cat]} {itemsHere.length > 0 && <span className="text-primary">({itemsHere.length})</span>}
                  </h4>
                  {!open && itemsHere.length > 0 && (
                    <span className="text-[11px] text-muted-foreground truncate">
                      · <span className="font-semibold text-primary">{formatINR(sectionTotal)}</span>
                    </span>
                  )}
                </button>
              </CollapsibleTrigger>
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>

              {isFalseCeiling ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addItem("false_ceiling")}>
                  <Plus className="h-3 w-3 mr-1" /> Add False Ceiling
                </Button>
              ) : isService ? (
                presets.length > 0 && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addItem(cat, presets[0])}>
                    <Plus className="h-3 w-3 mr-1" /> Add {CATEGORY_LABELS[cat]}
                  </Button>
                )
              ) : cat === "units" ? (
                <Popover open={unitPickerOpen} onOpenChange={(o) => { setUnitPickerOpen(o); if (!o) { setPickedCatalog(new Set()); setPickedPresets(new Set()); } }}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Add Units
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-0 z-[9999]">
                    <div className="p-3 border-b border-border">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Select units to add</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                      {presets.length === 0 && !isCommercial && (
                        <p className="text-xs text-muted-foreground p-2">No catalog presets — set room name first or use Custom Unit below.</p>
                      )}
                      {presets.map((p) => {
                        const checked = pickedCatalog.has(p.id);
                        return (
                          <label key={p.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer text-xs">
                            <Checkbox checked={checked} onCheckedChange={() => togglePickedCatalog(p.id)} />
                            <span className="flex-1">{p.name}</span>
                            {p.item_type === "accessory_fixed" && (
                              <span className="text-muted-foreground">{formatINR(Number(p.fixed_cost))}</span>
                            )}
                          </label>
                        );
                      })}
                      {isCommercial && COMMERCIAL_UNIT_PRESETS.map((name) => {
                        const checked = pickedPresets.has(name);
                        return (
                          <label key={`preset:${name}`} className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer text-xs">
                            <Checkbox checked={checked} onCheckedChange={() => togglePickedPreset(name)} />
                            <span className="flex-1">{name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="p-2 border-t border-border flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => { addItem("units"); setUnitPickerOpen(false); }}
                      >
                        + Custom Unit
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={pickedCatalog.size + pickedPresets.size === 0}
                        onClick={addMultipleUnits}
                      >
                        Add ({pickedCatalog.size + pickedPresets.size})
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Select onValueChange={(v) => {
                  const p = presets.find(x => x.id === v); if (p) addItem(cat, p);
                }}>
                  <SelectTrigger className="h-7 w-44 text-xs"><SelectValue placeholder={`+ Add ${CATEGORY_LABELS[cat]}`} /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {presets.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                        {p.item_type === "accessory_fixed" ? ` · ${formatINR(Number(p.fixed_cost))}` : ""}
                      </SelectItem>
                    ))}
                    {presets.length === 0 && <div className="text-xs text-muted-foreground p-2">No presets available</div>}
                  </SelectContent>
                </Select>
              )}
              </div>
            </div>

            <CollapsibleContent className="space-y-2 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            {cat === "units" && itemsHere.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <Label className="text-xs font-semibold uppercase text-primary">Core Material *</Label>
                  <Select
                    value={room.material_type_key ?? undefined}
                    onValueChange={(key) => {
                      if (onPickMaterialType) onPickMaterialType(key);
                      else onChange({ material_type_key: key });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material type" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {(matrix?.material ?? []).length === 0 && (
                        <div className="text-xs text-muted-foreground p-2">Configure in Settings → Pricing Matrix</div>
                      )}
                      {matrix?.material.map((m) => {
                        const hw = matrix.hardware.find((x) => x.key === quotationBrands.hardware)?.rate_per_sqft || 0;
                        const co = matrix.core_brand.find((x) => x.key === quotationBrands.core)?.rate_per_sqft || 0;
                        const la = matrix.laminate.find((x) => x.key === quotationBrands.laminate)?.rate_per_sqft || 0;
                        const sh = matrix.shutter_finish.find((x) => x.key === room.shutter_finish_key)?.rate_per_sqft || 0;
                        const total = Number(m.rate_per_sqft) + Number(hw) + Number(co) + Number(la) + Number(sh);
                        return (
                          <SelectItem key={m.key} value={m.key}>
                            {m.label} — ₹{total.toFixed(0)}/sqft
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {room.material_type_key ? (
                    <p className="text-[11px] text-muted-foreground">
                      All per-sqft units below use{" "}
                      <span className="font-medium text-foreground">
                        {matrix?.material.find((m) => m.key === room.material_type_key)?.label}
                      </span>{" "}
                      as base. Effective ₹/sqft = material + hardware + core brand + laminate + shutter.
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      Pick a material type — drives the live Pricing column on every unit.
                    </p>
                  )}
                </div>

                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <Label className="text-xs font-semibold uppercase text-primary">Shutter Finish</Label>
                  <Select
                    value={room.shutter_finish_key ?? undefined}
                    onValueChange={(key) => {
                      const finish = matrix?.shutter_finish.find((s) => s.key === key);
                      onChange({ shutter_finish_key: key, shutter_finish: finish?.label ?? key });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shutter finish" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {(matrix?.shutter_finish ?? []).length === 0 && (
                        <div className="text-xs text-muted-foreground p-2">Configure in Settings → Pricing Matrix</div>
                      )}
                      {matrix?.shutter_finish.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label} — ₹{Number(f.rate_per_sqft).toFixed(0)}/sqft
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {room.shutter_finish_key && (
                    <p className="text-[11px] text-muted-foreground">
                      Finish:{" "}
                      <span className="font-medium text-foreground">
                        {matrix?.shutter_finish.find((s) => s.key === room.shutter_finish_key)?.label}
                      </span>{" "}
                      — uplift ₹{(matrix?.shutter_finish.find((s) => s.key === room.shutter_finish_key)?.rate_per_sqft || 0).toFixed(0)}/sqft.
                      {(matrix?.shutter_finish.find((s) => s.key === room.shutter_finish_key)?.rate_per_sqft || 0) === 0 &&
                        " (Configure in Settings → Pricing Matrix.)"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {itemsHere.length > 0 && (
              <div className="space-y-2">
                {itemsHere.map((li) => (
                  <div key={li.tempId} className="rounded-md border border-border bg-background p-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={li.item_name}
                        onChange={(e) => updateItem(li.tempId, { item_name: e.target.value })}
                        className="h-8 text-sm font-medium border-0 bg-transparent px-1 focus-visible:ring-1"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        {li.item_type === "unit_sqft" && (() => {
                          const lr = rateForLine(li);
                          return (
                            <span
                              title={lr.title}
                              className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap",
                                lr.rate > 0
                                  ? lr.isOverride
                                    ? "bg-secondary text-secondary-foreground border border-secondary"
                                    : "bg-primary/15 text-primary border border-primary/30"
                                  : "bg-muted text-muted-foreground border border-border",
                              )}
                            >
                              {lr.rate > 0 ? `₹${lr.rate.toFixed(0)}/sqft${lr.isOverride ? " ★" : ""}` : "Pricing not set"}
                            </span>
                          );
                        })()}
                        <span className="text-sm font-bold text-primary">{formatINR(li.total_cost)}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(li.tempId)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Pricing mode selector for painting/electrical */}
                    {isService && (
                      <div className="flex gap-2 items-center">
                        <Select value={li.pricing_mode} onValueChange={(v: "sqft" | "lumpsum") => {
                          const next = { ...li, pricing_mode: v };
                          next.total_cost = calcLineItemTotal(next);
                          updateItem(li.tempId, { pricing_mode: v, total_cost: next.total_cost });
                        }}>
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="sqft">Per sqft</SelectItem>
                            <SelectItem value="lumpsum">Lumpsum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(li.pricing_mode === "sqft") && (
                        <>
                          <div>
                            <Label className="text-[10px] uppercase">W (ft)</Label>
                            <Input type="number" step="0.1" min={0} value={li.width_ft || ""} onChange={(e) => updateItem(li.tempId, { width_ft: parseFloat(e.target.value) || 0 })} className="h-8" />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase">H (ft)</Label>
                            <Input type="number" step="0.1" min={0} value={li.height_ft || ""} onChange={(e) => updateItem(li.tempId, { height_ft: parseFloat(e.target.value) || 0 })} className="h-8" />
                          </div>
                        </>
                      )}
                      <div>
                        <Label className="text-[10px] uppercase">Qty</Label>
                        <Input type="number" min={1} step="1" value={li.quantity || 1} onChange={(e) => updateItem(li.tempId, { quantity: parseInt(e.target.value) || 1 })} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase">
                          {li.pricing_mode === "sqft" ? "₹/sqft" : li.pricing_mode === "fixed" ? "₹/unit" : "Amount ₹"}
                        </Label>
                        <Input type="number" min={0} value={li.rate || ""} onChange={(e) => updateItem(li.tempId, { rate: parseFloat(e.target.value) || 0 })} className="h-8" />
                      </div>
                    </div>

                    {li.pricing_mode === "sqft" && li.area_sqft > 0 && (
                      <p className="text-[11px] text-muted-foreground">Area: {li.area_sqft.toFixed(2)} sqft × {formatINR(li.rate)} × {li.quantity}</p>
                    )}

                    {showMargin && (() => {
                      const qty = li.quantity || 1;
                      const cost = li.cost_rate || 0;
                      const itemCost =
                        li.pricing_mode === "sqft" ? (li.area_sqft || 0) * cost * qty
                        : li.pricing_mode === "fixed" ? cost * qty
                        : cost;
                      const margin = (li.total_cost || 0) - itemCost;
                      const marginPct = (li.total_cost || 0) > 0 ? (margin / li.total_cost) * 100 : 0;
                      const marginTone = marginPct >= 25 ? "text-primary border-primary/30 bg-primary/10"
                        : marginPct >= 10 ? "text-secondary-foreground border-border bg-secondary"
                        : "text-destructive border-destructive/30 bg-destructive/10";
                      return (
                        <div className="flex items-center gap-2 pt-1 border-t border-dashed border-border">
                          <Label className="text-[10px] uppercase text-muted-foreground shrink-0">
                            Cost {li.pricing_mode === "sqft" ? "₹/sqft" : li.pricing_mode === "fixed" ? "₹/unit" : "₹"}
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={li.cost_rate ?? ""}
                            onChange={(e) => updateItem(li.tempId, { cost_rate: parseFloat(e.target.value) || 0 })}
                            className="h-7 w-24 text-xs"
                            placeholder="0"
                          />
                          <span className={cn("ml-auto text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap", marginTone)}>
                            {cost > 0 ? `Margin ${formatINR(margin)} · ${marginPct.toFixed(0)}%` : "Set cost to see margin"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};
