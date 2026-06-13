import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Lock, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isCategoryEnabled,
  type PricingRoom,
  type PricingItemCategory,
  type RoomCategoryEnabledMap,
} from "@/components/admin/quotation/types";

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

interface Props {
  rooms: PricingRoom[];
  categories: PricingItemCategory[];
  enabledMap: RoomCategoryEnabledMap;
  onRoomsChange: (rooms: PricingRoom[]) => void;
  onCategoriesChange: (cats: PricingItemCategory[]) => void;
  onEnabledChange: (roomKey: string, categoryKey: string, enabled: boolean) => void;
}

export const RoomsAndCategoriesPanel = ({
  rooms,
  categories,
  enabledMap,
  onRoomsChange,
  onCategoriesChange,
  onEnabledChange,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [newRoom, setNewRoom] = useState("");
  const [newCat, setNewCat] = useState("");

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => a.sort_order - b.sort_order),
    [rooms],
  );
  const sortedCats = useMemo(
    () => [...categories].sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );
  const activeRooms = sortedRooms.filter((r) => r.active);
  const activeCats = sortedCats.filter((c) => c.active);

  const addRoom = () => {
    const label = newRoom.trim();
    if (!label) return;
    const key = slugify(label);
    if (rooms.some((r) => r.key === key)) return;
    onRoomsChange([
      ...rooms,
      {
        id: `new-room-${key}-${Date.now()}`,
        key,
        label,
        sort_order: (rooms[rooms.length - 1]?.sort_order ?? 0) + 10,
        is_preset: false,
        active: true,
      },
    ]);
    setNewRoom("");
  };

  const addCat = () => {
    const label = newCat.trim();
    if (!label) return;
    const key = slugify(label);
    if (categories.some((c) => c.key === key)) return;
    onCategoriesChange([
      ...categories,
      {
        id: `new-cat-${key}-${Date.now()}`,
        key,
        label,
        sort_order: (categories[categories.length - 1]?.sort_order ?? 0) + 10,
        is_preset: false,
        active: true,
      },
    ]);
    setNewCat("");
  };

  const updateRoom = (id: string, patch: Partial<PricingRoom>) =>
    onRoomsChange(rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const updateCat = (id: string, patch: Partial<PricingItemCategory>) =>
    onCategoriesChange(categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const moveRoom = (id: string, dir: -1 | 1) => {
    const idx = sortedRooms.findIndex((r) => r.id === id);
    const swapWith = sortedRooms[idx + dir];
    if (!swapWith) return;
    const a = sortedRooms[idx];
    onRoomsChange(
      rooms.map((r) =>
        r.id === a.id ? { ...r, sort_order: swapWith.sort_order } : r.id === swapWith.id ? { ...r, sort_order: a.sort_order } : r,
      ),
    );
  };

  const moveCat = (id: string, dir: -1 | 1) => {
    const idx = sortedCats.findIndex((c) => c.id === id);
    const swapWith = sortedCats[idx + dir];
    if (!swapWith) return;
    const a = sortedCats[idx];
    onCategoriesChange(
      categories.map((c) =>
        c.id === a.id ? { ...c, sort_order: swapWith.sort_order } : c.id === swapWith.id ? { ...c, sort_order: a.sort_order } : c,
      ),
    );
  };

  const deleteRoom = (id: string) => {
    const r = rooms.find((x) => x.id === id);
    if (!r || r.is_preset) return;
    onRoomsChange(rooms.filter((x) => x.id !== id));
  };

  const deleteCat = (id: string) => {
    const c = categories.find((x) => x.id === id);
    if (!c || c.is_preset) return;
    onCategoriesChange(categories.filter((x) => x.id !== id));
  };

  // Bulk toggle whole row / column
  const toggleRow = (roomKey: string, value: boolean) => {
    activeCats.forEach((c) => onEnabledChange(roomKey, c.key, value));
  };
  const toggleCol = (catKey: string, value: boolean) => {
    activeRooms.forEach((r) => onEnabledChange(r.key, catKey, value));
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-border rounded-lg bg-card overflow-hidden">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
            <h2 className="text-sm font-bold tracking-wide uppercase text-foreground">Rooms & Categories</h2>
            <span className="text-xs text-muted-foreground">
              ({activeRooms.length} room{activeRooms.length === 1 ? "" : "s"} · {activeCats.length} categor{activeCats.length === 1 ? "y" : "ies"})
            </span>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Rooms */}
            <Card className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Rooms</h3>
                <span className="text-[11px] text-muted-foreground">{rooms.length} total</span>
              </div>
              <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                {sortedRooms.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-1.5 rounded border border-border p-1.5 bg-background">
                    <div className="flex flex-col">
                      <button type="button" disabled={i === 0} onClick={() => moveRoom(r.id, -1)} className="disabled:opacity-30 hover:text-primary">
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button type="button" disabled={i === sortedRooms.length - 1} onClick={() => moveRoom(r.id, 1)} className="disabled:opacity-30 hover:text-primary">
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                    <Input
                      value={r.label}
                      onChange={(e) => updateRoom(r.id, { label: e.target.value })}
                      className="h-7 text-xs flex-1"
                    />
                    {r.is_preset && <Lock className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Preset (cannot delete)" />}
                    <Switch checked={r.active} onCheckedChange={(v) => updateRoom(r.id, { active: v })} />
                    {!r.is_preset && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRoom(r.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 pt-1">
                <Input
                  placeholder="Add room (e.g. Home Office)"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRoom())}
                  className="h-8 text-xs"
                />
                <Button type="button" size="sm" onClick={addRoom} className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </Card>

            {/* Categories */}
            <Card className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Item Categories</h3>
                <span className="text-[11px] text-muted-foreground">{categories.length} total</span>
              </div>
              <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                {sortedCats.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-1.5 rounded border border-border p-1.5 bg-background">
                    <div className="flex flex-col">
                      <button type="button" disabled={i === 0} onClick={() => moveCat(c.id, -1)} className="disabled:opacity-30 hover:text-primary">
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button type="button" disabled={i === sortedCats.length - 1} onClick={() => moveCat(c.id, 1)} className="disabled:opacity-30 hover:text-primary">
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                    <Input
                      value={c.label}
                      onChange={(e) => updateCat(c.id, { label: e.target.value })}
                      className="h-7 text-xs flex-1"
                    />
                    {c.is_preset && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                    <Switch checked={c.active} onCheckedChange={(v) => updateCat(c.id, { active: v })} />
                    {!c.is_preset && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCat(c.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 pt-1">
                <Input
                  placeholder="Add category (e.g. Crockery)"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCat())}
                  className="h-8 text-xs"
                />
                <Button type="button" size="sm" onClick={addCat} className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </Card>
          </div>

          {/* Enable matrix */}
          <Card className="p-3 space-y-2">
            <div>
              <h3 className="text-sm font-bold">Enabled categories per room</h3>
              <p className="text-[11px] text-muted-foreground">
                Uncheck a cell to hide that category column inside that room's pricing grid. Click a row/column header to bulk toggle.
              </p>
            </div>
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left font-semibold p-2 sticky left-0 bg-muted/40 z-10 min-w-[140px]">Room \\ Category</th>
                    {activeCats.map((c) => {
                      const allOn = activeRooms.every((r) => isCategoryEnabled(enabledMap, r.key, c.key));
                      return (
                        <th key={c.key} className="text-center font-semibold p-2 min-w-[80px]">
                          <button
                            type="button"
                            className="hover:text-primary"
                            onClick={() => toggleCol(c.key, !allOn)}
                            title="Toggle entire column"
                          >
                            {c.label}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {activeRooms.map((r) => {
                    const allOn = activeCats.every((c) => isCategoryEnabled(enabledMap, r.key, c.key));
                    return (
                      <tr key={r.key} className="border-t border-border/60">
                        <td className="p-2 font-medium sticky left-0 bg-background z-10">
                          <button
                            type="button"
                            className="hover:text-primary text-left"
                            onClick={() => toggleRow(r.key, !allOn)}
                            title="Toggle entire row"
                          >
                            {r.label}
                          </button>
                        </td>
                        {activeCats.map((c) => {
                          const enabled = isCategoryEnabled(enabledMap, r.key, c.key);
                          return (
                            <td key={c.key} className="p-2 text-center">
                              <Checkbox
                                checked={enabled}
                                onCheckedChange={(v) => onEnabledChange(r.key, c.key, !!v)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {(activeRooms.length === 0 || activeCats.length === 0) && (
                    <tr>
                      <td colSpan={activeCats.length + 1} className="p-3 text-center italic text-muted-foreground">
                        Activate at least one room and one category to manage the enable map.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default RoomsAndCategoriesPanel;
