// Money formatting (Indian system: lakhs / crores)
export function formatINR(n: number): string {
  if (!isFinite(n) || n === 0) return "₹0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000)    return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000)       return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function formatINRFull(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function startOfDay(d = new Date()): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
export function startOfWeek(d = new Date()): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}
export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function startOfYear(d = new Date()): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export function totalCollectedForLead(l: {
  payment_10_amount: number | null; payment_10_percent: boolean | null;
  payment_50_amount: number | null; payment_50_percent: boolean | null;
  payment_100_amount: number | null; payment_100_percent: boolean | null;
}): number {
  const a = l.payment_10_percent ? Number(l.payment_10_amount ?? 0) : 0;
  const b = l.payment_50_percent ? Number(l.payment_50_amount ?? 0) : 0;
  const c = l.payment_100_percent ? Number(l.payment_100_amount ?? 0) : 0;
  return a + b + c;
}

// ----- Date range presets -----
export type RangePreset =
  | "today" | "yesterday" | "last7" | "last30"
  | "this_month" | "last_month" | "this_year" | "all" | "custom";

export interface DateRange {
  preset: RangePreset;
  start: Date;
  end: Date; // exclusive
  label: string;
}

export function rangeFromPreset(preset: RangePreset, custom?: { start: Date; end: Date }): DateRange {
  const now = new Date();
  const sToday = startOfDay(now);
  const tomorrow = new Date(sToday); tomorrow.setDate(tomorrow.getDate() + 1);

  switch (preset) {
    case "today":
      return { preset, start: sToday, end: tomorrow, label: "Today" };
    case "yesterday": {
      const y = new Date(sToday); y.setDate(y.getDate() - 1);
      return { preset, start: y, end: sToday, label: "Yesterday" };
    }
    case "last7": {
      const s = new Date(sToday); s.setDate(s.getDate() - 6);
      return { preset, start: s, end: tomorrow, label: "Last 7 days" };
    }
    case "last30": {
      const s = new Date(sToday); s.setDate(s.getDate() - 29);
      return { preset, start: s, end: tomorrow, label: "Last 30 days" };
    }
    case "this_month": {
      const s = startOfMonth(now);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { preset, start: s, end: e, label: "This month" };
    }
    case "last_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = startOfMonth(now);
      return { preset, start: s, end: e, label: "Last month" };
    }
    case "this_year": {
      const s = startOfYear(now);
      const e = new Date(now.getFullYear() + 1, 0, 1);
      return { preset, start: s, end: e, label: "This year" };
    }
    case "all":
      return { preset, start: new Date(2000, 0, 1), end: tomorrow, label: "All time" };
    case "custom": {
      if (!custom) return rangeFromPreset("last30");
      const s = startOfDay(custom.start);
      const e = startOfDay(custom.end); e.setDate(e.getDate() + 1);
      return { preset, start: s, end: e, label: `${s.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${custom.end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` };
    }
  }
}

export function previousRange(r: DateRange): DateRange {
  const len = r.end.getTime() - r.start.getTime();
  const start = new Date(r.start.getTime() - len);
  const end = new Date(r.start.getTime());
  return { preset: r.preset, start, end, label: `Previous ${r.label.toLowerCase()}` };
}

export function inRange(iso: string | null | undefined, r: DateRange): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t < r.end.getTime();
}

export function pctDelta(current: number, prev: number): { value: number; direction: "up" | "down" | "flat" } {
  if (prev === 0 && current === 0) return { value: 0, direction: "flat" };
  if (prev === 0) return { value: 100, direction: "up" };
  const v = ((current - prev) / Math.abs(prev)) * 100;
  return { value: v, direction: v > 0.5 ? "up" : v < -0.5 ? "down" : "flat" };
}
