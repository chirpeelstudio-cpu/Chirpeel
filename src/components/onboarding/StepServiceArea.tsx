import { MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StaggerItem from "./StaggerItem";
import type { OnboardingState } from "@/pages/Onboarding";

interface Props {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}

const CITIES = [
  "Tirupur", "Coimbatore", "Erode", "Salem",
  "Madurai", "Chennai", "Bangalore", "Other",
];

export default function StepServiceArea({ state, update }: Props) {
  const selected = state.service_areas ?? [];

  const toggleCity = (c: string) => {
    const next = selected.includes(c)
      ? selected.filter(x => x !== c)
      : [...selected, c];
    // Auto-fill primary city with the first selection
    const patch: Partial<OnboardingState> = { service_areas: next };
    if (!state.primary_city && next.length > 0) patch.primary_city = next[0];
    if (selected.includes(c) && state.primary_city === c && next.length > 0) {
      patch.primary_city = next[0];
    }
    update(patch);
  };

  return (
    <div className="space-y-5">
      <StaggerItem index={0}>
        <h2 className="text-2xl font-bold">Where do you work?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We'll default lead locations and tag marketing campaigns by city. You can add more later.
        </p>
      </StaggerItem>

      <StaggerItem index={1}>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Service areas</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {CITIES.map((c, i) => {
            const active = selected.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCity(c)}
                style={{ animationDelay: `${(i + 2) * 40}ms` }}
                className={`opacity-0 animate-fade-in-up inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all hover:scale-105 active:scale-95 ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {c}
                {active && <X className="w-3 h-3 ml-0.5 opacity-70" />}
              </button>
            );
          })}
        </div>
        {selected.length === 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">Pick at least one city.</p>
        )}
      </StaggerItem>

      <StaggerItem index={11}>
        <Label htmlFor="primary_city" className="text-xs uppercase tracking-wider text-muted-foreground">
          Primary city
        </Label>
        <Input
          id="primary_city"
          className="mt-2"
          placeholder="Tirupur"
          value={state.primary_city ?? ""}
          onChange={(e) => update({ primary_city: e.target.value })}
        />
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Used as the default for new leads and on your client-facing pages.
        </p>
      </StaggerItem>
    </div>
  );
}