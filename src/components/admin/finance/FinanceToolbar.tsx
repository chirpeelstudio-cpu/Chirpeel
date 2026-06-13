import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar, X, Filter, Tag, IndianRupee } from "lucide-react";
import type { FinanceFilters, DateRangePreset, InvoiceStatusFilter } from "./filters";
import { PRESET_LABELS, resolveRange, DEFAULT_FILTERS, STATUS_LABELS } from "./filters";
import type { QuotationLite } from "./types";

interface Props {
  filters: FinanceFilters;
  onChange: (f: FinanceFilters) => void;
  quotations: QuotationLite[];
}

export function FinanceToolbar({ filters, onChange, quotations }: Props) {
  const [openCustom, setOpenCustom] = useState(false);
  const [openAmount, setOpenAmount] = useState(false);

  const { from, to } = useMemo(() => resolveRange(filters), [filters]);

  const setPreset = (preset: DateRangePreset) => {
    if (preset === "custom") {
      onChange({ ...filters, preset, from: filters.from ?? from ?? null, to: filters.to ?? to ?? null });
      setOpenCustom(true);
    } else {
      onChange({ ...filters, preset, from: null, to: null });
    }
  };

  const reset = () => onChange(DEFAULT_FILTERS);

  const activeQuo = quotations.find(q => q.id === filters.quotationId);
  const hasAmount = filters.amountMin != null || filters.amountMax != null;
  const hasActive =
    filters.preset !== DEFAULT_FILTERS.preset ||
    filters.quotationId !== "all" ||
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    hasAmount;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-8 h-9"
          />
        </div>

        {/* Date preset */}
        <Select value={filters.preset} onValueChange={(v) => setPreset(v as DateRangePreset)}>
          <SelectTrigger className="w-[150px] h-9">
            <Calendar className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PRESET_LABELS) as DateRangePreset[]).map(p => (
              <SelectItem key={p} value={p}>{PRESET_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom date range */}
        {filters.preset === "custom" && (
          <Popover open={openCustom} onOpenChange={setOpenCustom}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                {filters.from || "Start"} → {filters.to || "End"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 space-y-2" align="start">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={filters.from || ""} onChange={(e) => onChange({ ...filters, from: e.target.value || null })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={filters.to || ""} onChange={(e) => onChange({ ...filters, to: e.target.value || null })} />
              </div>
              <Button size="sm" className="w-full" onClick={() => setOpenCustom(false)}>Apply</Button>
            </PopoverContent>
          </Popover>
        )}

        {/* Project filter */}
        <Select value={filters.quotationId} onValueChange={(v) => onChange({ ...filters, quotationId: v })}>
          <SelectTrigger className="w-[200px] h-9">
            <Filter className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {quotations.map(q => (
              <SelectItem key={q.id} value={q.id}>
                {q.quotation_number} — {q.customer_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v as InvoiceStatusFilter })}>
          <SelectTrigger className="w-[140px] h-9">
            <Tag className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABELS) as InvoiceStatusFilter[]).map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Amount filter */}
        <Popover open={openAmount} onOpenChange={setOpenAmount}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <IndianRupee className="w-3.5 h-3.5 mr-1" />
              {hasAmount
                ? `${filters.amountMin ?? "0"} – ${filters.amountMax ?? "∞"}`
                : "Amount"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-2" align="start">
            <div>
              <label className="text-xs text-muted-foreground">Min (₹)</label>
              <Input
                type="number"
                value={filters.amountMin ?? ""}
                onChange={(e) => onChange({ ...filters, amountMin: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max (₹)</label>
              <Input
                type="number"
                value={filters.amountMax ?? ""}
                onChange={(e) => onChange({ ...filters, amountMax: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="No limit"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onChange({ ...filters, amountMin: null, amountMax: null })}>Clear</Button>
              <Button size="sm" className="flex-1" onClick={() => setOpenAmount(false)}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>

        {hasActive && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-9 text-xs">
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActive && (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="gap-1 text-xs">
            {PRESET_LABELS[filters.preset]}
            {from && to && filters.preset !== "all" && <span className="opacity-70">· {from} → {to}</span>}
          </Badge>
          {activeQuo && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {activeQuo.quotation_number}
              <button onClick={() => onChange({ ...filters, quotationId: "all" })} aria-label="Clear project">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.status !== "all" && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {STATUS_LABELS[filters.status]}
              <button onClick={() => onChange({ ...filters, status: "all" })} aria-label="Clear status">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {hasAmount && (
            <Badge variant="secondary" className="gap-1 text-xs">
              ₹{filters.amountMin ?? 0} – {filters.amountMax != null ? `₹${filters.amountMax}` : "∞"}
              <button onClick={() => onChange({ ...filters, amountMin: null, amountMax: null })} aria-label="Clear amount">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.search.trim() && (
            <Badge variant="secondary" className="gap-1 text-xs">
              "{filters.search}"
              <button onClick={() => onChange({ ...filters, search: "" })} aria-label="Clear search">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
