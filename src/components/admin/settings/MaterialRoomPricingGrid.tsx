import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  isCategoryEnabled,
  type MaterialRoomPricingRow,
  type PricingRoom,
  type PricingItemCategory,
  type RoomCategoryEnabledMap,
} from "@/components/admin/quotation/types";

interface Props {
  materialKey: string;
  materialLabel: string;
  defaultRate: number;
  rows: MaterialRoomPricingRow[];
  rooms: PricingRoom[];
  categories: PricingItemCategory[];
  enabledMap: RoomCategoryEnabledMap;
  onChange: (roomKey: string, categoryKey: string, rate: number) => void;
}

/**
 * Editable grid: rows = active rooms, columns = active categories.
 * Cells where (room × category) is disabled in `enabledMap` show "—" and accept no input.
 */
export const MaterialRoomPricingGrid = ({
  materialKey,
  materialLabel,
  defaultRate,
  rows,
  rooms,
  categories,
  enabledMap,
  onChange,
}: Props) => {
  const [showOnlyUsed, setShowOnlyUsed] = useState(false);

  const activeRooms = useMemo(
    () => rooms.filter((r) => r.active).sort((a, b) => a.sort_order - b.sort_order),
    [rooms],
  );
  const activeCats = useMemo(
    () => categories.filter((c) => c.active).sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );

  const cellMap = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    rows.forEach((r) => {
      if (r.material_key !== materialKey) return;
      (m[r.room_key] ||= {})[r.category_key] = Number(r.rate_per_sqft || 0);
    });
    return m;
  }, [rows, materialKey]);

  const visibleRooms = useMemo(() => {
    if (!showOnlyUsed) return activeRooms;
    return activeRooms.filter((r) => {
      const cells = cellMap[r.key];
      return cells && Object.values(cells).some((v) => v > 0);
    });
  }, [showOnlyUsed, activeRooms, cellMap]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Per-room rate for <span className="font-semibold text-foreground">{materialLabel}</span>. Empty cell falls back to default ₹{defaultRate}/sqft. Disabled cells show "—".
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => setShowOnlyUsed((v) => !v)}
        >
          {showOnlyUsed ? "Show all rooms" : "Show only used"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left font-semibold p-2 sticky left-0 bg-muted/40 z-10 min-w-[140px]">Room</th>
              {activeCats.map((c) => (
                <th key={c.key} className="text-center font-semibold p-2 min-w-[90px]">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(visibleRooms.length === 0 || activeCats.length === 0) && (
              <tr>
                <td colSpan={activeCats.length + 1} className="p-3 text-center italic text-muted-foreground">
                  No rooms/categories active — defaults apply everywhere.
                </td>
              </tr>
            )}
            {visibleRooms.map((room) => (
              <tr key={room.key} className="border-t border-border/60">
                <td className="p-2 font-medium sticky left-0 bg-background z-10">{room.label}</td>
                {activeCats.map((c) => {
                  const enabled = isCategoryEnabled(enabledMap, room.key, c.key);
                  if (!enabled) {
                    return (
                      <td key={c.key} className="p-1 text-center text-muted-foreground/60 italic">—</td>
                    );
                  }
                  const val = cellMap[room.key]?.[c.key] ?? 0;
                  return (
                    <td key={c.key} className="p-1">
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={val || ""}
                        placeholder="—"
                        onChange={(e) => onChange(room.key, c.key, parseFloat(e.target.value) || 0)}
                        className="h-7 text-right text-xs px-1.5"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialRoomPricingGrid;
