import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Copy, ChevronsUpDown, ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { LineItemsSection } from "./LineItemsSection";
import {
  calcLineItemTotal,
  calcRoomTotal,
  COMMERCIAL_PROJECT_TYPES,
  COMMERCIAL_ROOM_PRESETS,
  computeUnitRate,
  detectRoomType,
  formatINR,
  inferCategoryKey,
  ROOM_PRESETS,
  roomSlug,
  type MaterialPricingMatrix,
  type MaterialRoomOverrides,
  type PricingItem,
  type QuotationRoom,
} from "./types";

interface RoomCardProps {
  room: QuotationRoom;
  index: number;
  catalog: PricingItem[];
  matrix: MaterialPricingMatrix | null;
  roomOverrides?: MaterialRoomOverrides | null;
  quotationBrands: { hardware: string | null; core: string | null; laminate: string | null };
  projectType?: string | null;
  showMargin?: boolean;
  onChange: (room: QuotationRoom) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

export const RoomCard = ({
  room,
  index,
  catalog,
  matrix,
  roomOverrides,
  quotationBrands,
  projectType,
  showMargin,
  onChange,
  onRemove,
  onDuplicate,
}: RoomCardProps) => {
  const [nameOpen, setNameOpen] = useState(false);
  const [open, setOpen] = useState(true);
  const presets = projectType && COMMERCIAL_PROJECT_TYPES.includes(projectType) ? COMMERCIAL_ROOM_PRESETS : ROOM_PRESETS;

  const update = (patch: Partial<QuotationRoom>) => {
    const next = { ...room, ...patch };
    next.area_sqft = (next.width_ft || 0) * (next.height_ft || 0);
    next.total_cost = calcRoomTotal(next);
    onChange(next);
  };

  const setRoomName = (name: string) => {
    const room_type = detectRoomType(name);
    update({ room_name: name, room_type });
  };

  const pickMaterialType = (key: string) => {
    const rKey = roomSlug(room.room_name);
    const items = (room.line_items ?? []).map((li) => {
      if (li.item_type !== "unit_sqft") return li;
      const catKey = inferCategoryKey(li.item_name);
      const newRate = computeUnitRate(
        matrix,
        key,
        quotationBrands.hardware,
        quotationBrands.core,
        quotationBrands.laminate,
        room.shutter_finish_key,
        roomOverrides,
        rKey,
        catKey,
      );
      const updated = { ...li, rate: newRate };
      updated.total_cost = calcLineItemTotal(updated);
      return updated;
    });
    const next = { ...room, material_type_key: key, line_items: items };
    next.total_cost = calcRoomTotal(next);
    onChange(next);
  };

  return (
    <Card className="p-4 space-y-3 border-border animate-fade-in">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              {index + 1}
            </span>
            <Popover open={nameOpen} onOpenChange={setNameOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-8 px-2 font-semibold text-base">
                  {room.room_name || "Select room"} <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0 z-[9999]" align="start">
                <Command>
                  <CommandInput placeholder="Search or type..." value={room.room_name} onValueChange={setRoomName} />
                  <CommandList>
                    <CommandEmpty>Press Enter to use custom name</CommandEmpty>
                    <CommandGroup>
                      {presets.map((preset) => (
                        <CommandItem key={preset} value={preset} onSelect={() => { setRoomName(preset); setNameOpen(false); }}>
                          {preset}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {!open && (
              <span className="hidden sm:inline text-xs text-muted-foreground truncate">
                {room.line_items?.length ?? 0} items · <span className="font-semibold text-primary">{formatINR(room.total_cost)}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate} title="Duplicate room">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onRemove} title="Remove room">
              <Trash2 className="h-4 w-4" />
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title={open ? "Collapse" : "Expand"}>
                <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="space-y-4 pt-4 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <LineItemsSection
            room={room}
            catalog={catalog}
            matrix={matrix}
            roomOverrides={roomOverrides}
            quotationBrands={quotationBrands}
            projectType={projectType}
            showMargin={showMargin}
            onChange={update}
            onPickMaterialType={pickMaterialType}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <Label className="text-xs">Additional / Custom cost (₹)</Label>
              <Input type="number" min={0} value={room.custom_cost || ""} onChange={(e) => update({ custom_cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={room.notes ?? ""} onChange={(e) => update({ notes: e.target.value })} placeholder="Any specific instructions" />
            </div>
          </div>

          <div className={cn("flex items-center justify-between rounded-md px-3 py-2 text-sm", "bg-muted/50")}>
            <div className="flex gap-4 text-muted-foreground">
              {(room.line_items?.length ?? 0) > 0 && <span>{room.line_items.length} items</span>}
            </div>
            <div className="font-bold text-base text-primary">{formatINR(room.total_cost)}</div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
