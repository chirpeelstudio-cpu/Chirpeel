import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { rangeFromPreset, type DateRange, type RangePreset } from "./utils";

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_year", label: "This year" },
  { key: "all", label: "All time" },
];

interface Props {
  value: DateRange;
  onChange: (r: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>(value.preset === "custom" ? value.start : undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(value.preset === "custom" ? new Date(value.end.getTime() - 86400_000) : undefined);

  const apply = (preset: RangePreset) => {
    onChange(rangeFromPreset(preset));
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    onChange(rangeFromPreset("custom", { start: customStart, end: customEnd }));
    setCustomOpen(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarIcon className="h-4 w-4" />
          {value.label}
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="end">
        <div className="flex flex-col">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => apply(p.key)}
              className={cn(
                "text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent",
                value.preset === p.key && "bg-accent font-medium"
              )}
            >
              {p.label}
            </button>
          ))}
          <Popover open={customOpen} onOpenChange={setCustomOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent",
                  value.preset === "custom" && "bg-accent font-medium"
                )}
              >
                Custom range…
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 space-y-2" align="end" side="left">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Start</p>
                <Calendar mode="single" selected={customStart} onSelect={setCustomStart} className={cn("p-0 pointer-events-auto")} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">End</p>
                <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} className={cn("p-0 pointer-events-auto")} />
              </div>
              <Button size="sm" className="w-full" disabled={!customStart || !customEnd} onClick={applyCustom}>Apply</Button>
            </PopoverContent>
          </Popover>
        </div>
      </PopoverContent>
    </Popover>
  );
}
