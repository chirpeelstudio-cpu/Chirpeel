import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Info, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  buildPricingMatrix,
  buildRoomCategoryEnabledMap,
  formatINR,
  type MaterialPricingMatrix as Matrix,
  type MaterialPricingRow,
  type MaterialPricingScope,
  type MaterialRoomPricingRow,
  type PricingRoom,
  type PricingItemCategory,
  type RoomCategoryMapRow,
} from "@/components/admin/quotation/types";
import { MaterialRoomPricingGrid } from "./MaterialRoomPricingGrid";
import { RoomsAndCategoriesPanel } from "./RoomsAndCategoriesPanel";
import { BrandsPanel } from "./BrandsPanel";

const SCOPE_LABELS: Record<MaterialPricingScope, string> = {
  material: "Material Types (default ₹/sqft)",
  hardware: "Hardware Brand uplift (₹/sqft)",
  core_brand: "Core Material Brand uplift (₹/sqft)",
  laminate: "Laminate Brand uplift (₹/sqft)",
  shutter_finish: "Shutter Finish uplift (₹/sqft)",
  acrylic: "Acrylic Brand uplift (₹/sqft)",
  pu_paint: "PU Paint Brand uplift (₹/sqft)",
  membrane: "Membrane Brand uplift (₹/sqft)",
  gypsum: "Gypsum Brand uplift (₹/sqft)",
  channel: "Channel Brand uplift (₹/sqft)",
  paint: "Paint Brand uplift (₹/sqft)",
  wiring: "Wiring Brand uplift (₹/sqft)",
  switches: "Switches & Sockets Brand uplift (₹/sqft)",
};

const SCOPE_HELP: Record<MaterialPricingScope, string> = {
  material: "Default per-sqft rate of the raw material — used wherever no per-room override is set below.",
  hardware: "Added on top of base when the customer picks this hardware brand.",
  core_brand: "Added on top of base when the customer picks this core material brand.",
  laminate: "Added on top of base when the customer picks this laminate brand.",
  shutter_finish: "Added on top of base when the room uses this shutter finish (Laminate / Acrylic / PU / Membrane).",
  acrylic: "Uplift when the customer picks this acrylic brand.",
  pu_paint: "Uplift when the customer picks this PU paint brand.",
  membrane: "Uplift when the customer picks this membrane brand.",
  gypsum: "Uplift for false-ceiling gypsum brand.",
  channel: "Uplift for false-ceiling channel brand.",
  paint: "Uplift for wall paint brand.",
  wiring: "Uplift for electrical wiring brand.",
  switches: "Uplift for switches & sockets brand.",
};

interface GroupDef {
  label: string;
  scopes: MaterialPricingScope[];
}

const GROUPS: GroupDef[] = [
  { label: "Woodwork", scopes: ["material", "hardware", "core_brand", "laminate", "shutter_finish", "acrylic", "pu_paint", "membrane"] },
  { label: "False Ceiling", scopes: ["gypsum", "channel"] },
  { label: "Paint", scopes: ["paint"] },
  { label: "Electrical", scopes: ["wiring", "switches"] },
];

const STORAGE_KEY = "pricing-matrix-open-groups-v2";

const MaterialPricingMatrix = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<MaterialPricingRow[]>([]);
  const [roomRows, setRoomRows] = useState<MaterialRoomPricingRow[]>([]);
  const [pricingRooms, setPricingRooms] = useState<PricingRoom[]>([]);
  const [pricingCats, setPricingCats] = useState<PricingItemCategory[]>([]);
  const [roomCatMap, setRoomCatMap] = useState<RoomCategoryMapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* noop */ }
    return { Woodwork: true, "False Ceiling": false, Paint: false, Electrical: false };
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups)); } catch { /* noop */ }
  }, [openGroups]);

  const load = async () => {
    setLoading(true);
    const [
      { data: matrixData, error: e1 },
      { data: roomData, error: e2 },
      { data: prData, error: e3 },
      { data: pcData, error: e4 },
      { data: rcmData, error: e5 },
    ] = await Promise.all([
      supabase.from("material_pricing" as never).select("*").order("scope").order("sort_order"),
      supabase.from("material_room_pricing" as never).select("*"),
      supabase.from("pricing_rooms" as never).select("*").order("sort_order"),
      supabase.from("pricing_item_categories" as never).select("*").order("sort_order"),
      supabase.from("room_category_map" as never).select("*"),
    ]);
    if (e1) toast({ title: "Failed to load pricing matrix", description: e1.message, variant: "destructive" });
    if (e2) toast({ title: "Failed to load per-room overrides", description: e2.message, variant: "destructive" });
    if (e3) toast({ title: "Failed to load rooms", description: e3.message, variant: "destructive" });
    if (e4) toast({ title: "Failed to load categories", description: e4.message, variant: "destructive" });
    if (e5) toast({ title: "Failed to load room/category map", description: e5.message, variant: "destructive" });
    setRows((matrixData ?? []) as unknown as MaterialPricingRow[]);
    setRoomRows((roomData ?? []) as unknown as MaterialRoomPricingRow[]);
    setPricingRooms((prData ?? []) as unknown as PricingRoom[]);
    setPricingCats((pcData ?? []) as unknown as PricingItemCategory[]);
    setRoomCatMap((rcmData ?? []) as unknown as RoomCategoryMapRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const matrix: Matrix = useMemo(() => buildPricingMatrix(rows), [rows]);
  const enabledMap = useMemo(() => buildRoomCategoryEnabledMap(roomCatMap), [roomCatMap]);

  const updateRate = (id: string, value: number) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, rate_per_sqft: value } : r)));
  };

  /** Update or insert a per-room override into local state. */
  const updateRoomRate = (materialKey: string, roomKey: string, categoryKey: string, value: number) => {
    setRoomRows((rs) => {
      const idx = rs.findIndex(
        (r) => r.material_key === materialKey && r.room_key === roomKey && r.category_key === categoryKey,
      );
      if (idx >= 0) {
        const next = [...rs];
        next[idx] = { ...next[idx], rate_per_sqft: value };
        return next;
      }
      return [
        ...rs,
        {
          id: `new-${materialKey}-${roomKey}-${categoryKey}-${Date.now()}`,
          material_key: materialKey,
          room_key: roomKey,
          category_key: categoryKey,
          rate_per_sqft: value,
        },
      ];
    });
  };

  /** Update enable map (room × category) in local state. */
  const updateEnabled = (roomKey: string, categoryKey: string, enabled: boolean) => {
    setRoomCatMap((rs) => {
      const idx = rs.findIndex((r) => r.room_key === roomKey && r.category_key === categoryKey);
      if (idx >= 0) {
        const next = [...rs];
        next[idx] = { ...next[idx], enabled };
        return next;
      }
      return [
        ...rs,
        { id: `new-rcm-${roomKey}-${categoryKey}-${Date.now()}`, room_key: roomKey, category_key: categoryKey, enabled },
      ];
    });
  };

  const save = async () => {
    setSaving(true);

    // 1. Save default material rates
    const matrixUpdates = rows.map((r) =>
      supabase.from("material_pricing" as never).update({ rate_per_sqft: r.rate_per_sqft } as never).eq("id", r.id),
    );

    // 2. Upsert per-room overrides
    const upsertPayload = roomRows
      .filter((r) => r.rate_per_sqft > 0)
      .map((r) => ({
        material_key: r.material_key,
        room_key: r.room_key,
        category_key: r.category_key,
        rate_per_sqft: r.rate_per_sqft,
      }));

    const deletePayload = roomRows.filter((r) => r.rate_per_sqft <= 0 && !r.id.startsWith("new-"));

    const upsertPromise = upsertPayload.length
      ? supabase
          .from("material_room_pricing" as never)
          .upsert(upsertPayload as never, { onConflict: "material_key,room_key,category_key" } as never)
      : Promise.resolve({ error: null });

    const deletePromises = deletePayload.map((r) =>
      supabase.from("material_room_pricing" as never).delete().eq("id", r.id),
    );

    // 3. Persist rooms (upsert by key)
    const roomsUpsert = pricingRooms.length
      ? supabase
          .from("pricing_rooms" as never)
          .upsert(
            pricingRooms.map((r) => ({
              key: r.key,
              label: r.label,
              sort_order: r.sort_order,
              is_preset: r.is_preset,
              active: r.active,
            })) as never,
            { onConflict: "key" } as never,
          )
      : Promise.resolve({ error: null });

    // 4. Persist categories
    const catsUpsert = pricingCats.length
      ? supabase
          .from("pricing_item_categories" as never)
          .upsert(
            pricingCats.map((c) => ({
              key: c.key,
              label: c.label,
              sort_order: c.sort_order,
              is_preset: c.is_preset,
              active: c.active,
            })) as never,
            { onConflict: "key" } as never,
          )
      : Promise.resolve({ error: null });

    // 5. Persist room×category enable map
    const rcmUpsert = roomCatMap.length
      ? supabase
          .from("room_category_map" as never)
          .upsert(
            roomCatMap.map((r) => ({
              room_key: r.room_key,
              category_key: r.category_key,
              enabled: r.enabled,
            })) as never,
            { onConflict: "room_key,category_key" } as never,
          )
      : Promise.resolve({ error: null });

    const results = await Promise.all([
      ...matrixUpdates,
      upsertPromise,
      ...deletePromises,
      roomsUpsert,
      catsUpsert,
      rcmUpsert,
    ]);
    const failures = results.filter((r: any) => r?.error);
    setSaving(false);

    if (failures.length) {
      toast({
        title: "Save partially failed",
        description: `${failures.length} change(s) failed: ${(failures[0] as any)?.error?.message ?? ""}`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Pricing matrix saved", description: "Live rates updated everywhere." });
      load();
    }
  };


  const preview = useMemo(() => {
    const firstMaterial = matrix.material[0];
    const firstHw = matrix.hardware[0];
    const firstCore = matrix.core_brand[0];
    const firstLam = matrix.laminate[0];
    const total =
      Number(firstMaterial?.rate_per_sqft || 0) +
      Number(firstHw?.rate_per_sqft || 0) +
      Number(firstCore?.rate_per_sqft || 0) +
      Number(firstLam?.rate_per_sqft || 0);
    return { firstMaterial, firstHw, firstCore, firstLam, total };
  }, [matrix]);

  if (loading) {
    return (
      <Card className="p-12 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <Card className="p-4 bg-primary/5 border-primary/30">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-foreground">How dynamic pricing works</p>
            <p className="text-muted-foreground text-xs">
              Effective ₹/sqft = <span className="font-mono">material_base + hardware + core_brand + laminate + shutter</span>.
              The <span className="font-semibold text-foreground">material_base</span> can now be overridden <em>per room × per item category</em>
              (Wardrobe, Loft, Base Unit, Wall Unit, TV Unit, Vanity, Storage, Other). Empty cells fall back to the material's default rate.
            </p>
            {preview.firstMaterial && (
              <p className="text-xs text-foreground mt-2">
                <span className="text-muted-foreground">Sample:</span>{" "}
                {preview.firstMaterial.label} ({formatINR(preview.firstMaterial.rate_per_sqft)}) +{" "}
                {preview.firstHw?.label} ({formatINR(preview.firstHw?.rate_per_sqft || 0)}) +{" "}
                {preview.firstCore?.label} ({formatINR(preview.firstCore?.rate_per_sqft || 0)}) +{" "}
                {preview.firstLam?.label} ({formatINR(preview.firstLam?.rate_per_sqft || 0)}) ={" "}
                <span className="font-bold text-primary">{formatINR(preview.total)}/sqft</span>
              </p>
            )}
          </div>
        </div>
      </Card>

      <BrandsPanel />

      <RoomsAndCategoriesPanel
        rooms={pricingRooms}
        categories={pricingCats}
        enabledMap={enabledMap}
        onRoomsChange={setPricingRooms}
        onCategoriesChange={setPricingCats}
        onEnabledChange={updateEnabled}
      />

      {GROUPS.map((group) => {
        const totalBrands = group.scopes.reduce((s, sc) => s + (matrix[sc]?.length || 0), 0);
        const open = openGroups[group.label] ?? false;
        return (
          <Collapsible
            key={group.label}
            open={open}
            onOpenChange={(v) => setOpenGroups((g) => ({ ...g, [group.label]: v }))}
            className="border border-border rounded-lg bg-card overflow-hidden"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
                  <h2 className="text-sm font-bold tracking-wide uppercase text-foreground">{group.label}</h2>
                  <span className="text-xs text-muted-foreground">({totalBrands} brand{totalBrands === 1 ? "" : "s"})</span>
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                {group.scopes.map((scope) => (
                  <Card key={scope} className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{SCOPE_LABELS[scope]}</h3>
                      <p className="text-xs text-muted-foreground">{SCOPE_HELP[scope]}</p>
                    </div>
                    {matrix[scope].length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">No brands configured yet — add brand options to enable per-sqft uplifts.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {matrix[scope].map((r) => (
                          <div key={r.id} className="flex items-center gap-2 rounded-md border border-border p-2 bg-background">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{r.label}</div>
                              <div className="text-[10px] text-muted-foreground">{r.key}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-muted-foreground">₹</span>
                              <Input
                                type="number"
                                min={0}
                                step="1"
                                value={r.rate_per_sqft || ""}
                                onChange={(e) => updateRate(r.id, parseFloat(e.target.value) || 0)}
                                className="h-8 w-20 text-right"
                              />
                              <span className="text-[10px] text-muted-foreground">/sqft</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Per-room × per-category grid for woodwork material types */}
                    {scope === "material" && matrix.material.length > 0 && (
                      <div className="space-y-4 pt-2">
                        <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground border-t border-border pt-3">
                          Per-Room × Per-Category overrides
                        </div>
                        {matrix.material.map((m) => (
                          <details key={m.id} className="group rounded-md border border-border bg-background/50">
                            <summary className="cursor-pointer list-none px-3 py-2 flex items-center gap-2 hover:bg-accent/50 transition-colors">
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
                              <span className="text-sm font-semibold flex-1">{m.label}</span>
                              <span className="text-xs text-muted-foreground">default ₹{m.rate_per_sqft}/sqft</span>
                            </summary>
                            <div className="p-3 border-t border-border">
                              <MaterialRoomPricingGrid
                                materialKey={m.key}
                                materialLabel={m.label}
                                defaultRate={Number(m.rate_per_sqft || 0)}
                                rows={roomRows}
                                rooms={pricingRooms}
                                categories={pricingCats}
                                enabledMap={enabledMap}
                                onChange={(roomKey, categoryKey, value) =>
                                  updateRoomRate(m.key, roomKey, categoryKey, value)
                                }
                              />
                            </div>
                          </details>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Pricing Matrix
        </Button>
      </div>
    </div>
  );
};

export default MaterialPricingMatrix;
