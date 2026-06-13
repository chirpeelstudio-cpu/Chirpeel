import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandOption } from "./brands";

interface BrandSelectorProps {
  label: string;
  options: BrandOption[];
  /** Single selected brand id. Legacy CSV values fall back to first id. */
  value: string | null;
  onChange: (id: string | null) => void;
}

const firstId = (v: string | null): string | null => {
  if (!v) return null;
  const first = v.split(",").map((s) => s.trim()).filter(Boolean)[0];
  return first ?? null;
};

export const BrandSelector = ({ label, options, value, onChange }: BrandSelectorProps) => {
  const selectedId = firstId(value);

  const pick = (id: string) => {
    onChange(selectedId === id ? null : id);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {selectedId && <span className="ml-2 text-primary normal-case">(1 selected)</span>}
        </h3>
        {selectedId && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] text-muted-foreground hover:text-destructive underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {options.map((b) => {
          const isSelected = selectedId === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => pick(b.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-md border-2 bg-background transition-all hover:border-primary/50",
                isSelected ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border",
              )}
            >
              {isSelected && (
                <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="w-2.5 h-2.5" />
                </span>
              )}
              <div className="h-10 w-full flex items-center justify-center">
                {b.logo ? (
                  <img src={b.logo} alt={b.name} className="max-h-10 max-w-full object-contain" />
                ) : (
                  <span className="text-sm font-bold text-foreground/80">{b.name}</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight">{b.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
