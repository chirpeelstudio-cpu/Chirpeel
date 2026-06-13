import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "./types";

interface PricingSummaryProps {
  subtotal: number;
  discountType: "percent" | "amount";
  discountValue: number;
  discountAmount: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  /** Internal cost — only displayed when showMargin is true. */
  totalCost?: number;
  /** When true, renders the cost / margin / margin% rows (admin & manager only). */
  showMargin?: boolean;
  onChange: (patch: { discountType?: "percent" | "amount"; discountValue?: number; gstEnabled?: boolean; gstRate?: number }) => void;
}

export const PricingSummary = (p: PricingSummaryProps) => {
  return (
    <Card className="p-4 space-y-3 sticky top-20">
      <h3 className="font-bold text-base">Pricing Summary</h3>

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-semibold">{formatINR(p.subtotal)}</span>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Discount</Label>
        <div className="flex gap-2">
          <Select value={p.discountType} onValueChange={(v: "percent" | "amount") => p.onChange({ discountType: v })}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="percent">%</SelectItem>
              <SelectItem value="amount">₹</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" min={0} value={p.discountValue || ""} onChange={(e) => p.onChange({ discountValue: parseFloat(e.target.value) || 0 })} />
        </div>
        {p.discountAmount > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Discount applied</span>
            <span className="text-destructive">− {formatINR(p.discountAmount)}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Apply GST</Label>
          <Switch checked={p.gstEnabled} onCheckedChange={(v) => p.onChange({ gstEnabled: v })} />
        </div>
        {p.gstEnabled && (
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={100} value={p.gstRate} onChange={(e) => p.onChange({ gstRate: parseFloat(e.target.value) || 0 })} className="w-20" />
            <span className="text-xs text-muted-foreground">% — {formatINR(p.gstAmount)}</span>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Total</span>
        <span className="text-2xl font-bold text-primary">{formatINR(p.totalAmount)}</span>
      </div>

      {p.showMargin && (
        <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wide text-primary">Internal · Margin</div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Cost</span>
            <span className="font-semibold">{formatINR(p.totalCost ?? 0)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Margin (vs subtotal)</span>
            <span className="font-semibold">
              {formatINR(Math.max(0, (p.subtotal || 0) - (p.totalCost ?? 0)))}
              {(p.subtotal || 0) > 0 && (
                <span className="ml-1 text-muted-foreground">
                  · {(((p.subtotal - (p.totalCost ?? 0)) / p.subtotal) * 100).toFixed(1)}%
                </span>
              )}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground italic">Visible to admins & managers only.</p>
        </div>
      )}
    </Card>
  );
};
