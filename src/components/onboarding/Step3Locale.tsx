import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OnboardingState } from "@/pages/Onboarding";

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee (₹)", tz: "Asia/Kolkata", fy: 4 },
  { code: "USD", symbol: "$", label: "US Dollar ($)",     tz: "America/New_York", fy: 1 },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham (د.إ)", tz: "Asia/Dubai", fy: 1 },
  { code: "GBP", symbol: "£", label: "British Pound (£)", tz: "Europe/London", fy: 4 },
];

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Bangkok",
  "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles",
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface Props {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}

export default function Step3Locale({ state, update }: Props) {
  const onCurrency = (code: string) => {
    const c = CURRENCIES.find((x) => x.code === code);
    if (!c) return;
    update({ currency: c.code, currency_symbol: c.symbol, timezone: c.tz, fy_start_month: c.fy });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Currency & locale</h2>
        <p className="text-sm text-muted-foreground mt-1">Defaults for invoices, reports, and financial year cycles.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>Currency</Label>
          <Select value={state.currency} onValueChange={onCurrency}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Timezone</Label>
          <Select value={state.timezone} onValueChange={(v) => update({ timezone: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Financial year starts</Label>
          <Select value={String(state.fy_start_month)} onValueChange={(v) => update({ fy_start_month: parseInt(v) })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
        Tip: India uses an April–March financial year. UAE, USA, and Singapore typically use January–December.
      </div>
    </div>
  );
}
