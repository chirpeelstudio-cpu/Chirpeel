import { ChefHat, DoorClosed, Home as HomeIcon, Building2, Wrench, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import StaggerItem from "./StaggerItem";
import type { OnboardingState } from "@/pages/Onboarding";

interface Props {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}

const SPECIALTIES = [
  { id: "kitchen",   label: "Modular kitchen",      icon: ChefHat,    desc: "Your bread & butter" },
  { id: "wardrobe",  label: "Wardrobes",            icon: DoorClosed, desc: "Sliding, hinged, walk-in" },
  { id: "full_home", label: "Full home interiors",  icon: HomeIcon,   desc: "Turnkey 2/3/4 BHK" },
  { id: "office",    label: "Office / commercial",  icon: Building2,  desc: "Workspaces, retail, F&B" },
  { id: "renovation",label: "Renovation",           icon: Wrench,     desc: "Refresh existing spaces" },
] as const;

const TICKETS = [
  { id: "lt2",   label: "Under ₹2L" },
  { id: "2to5", label: "₹2L – ₹5L" },
  { id: "5to10", label: "₹5L – ₹10L" },
  { id: "gt10",  label: "Above ₹10L" },
];

const DURATIONS = [30, 45, 60, 90];

export default function StepSpecialties({ state, update }: Props) {
  const toggle = (id: string) => {
    const cur = state.specialties ?? [];
    update({
      specialties: cur.includes(id) ? cur.filter(s => s !== id) : [...cur, id],
    });
  };

  return (
    <div className="space-y-5">
      <StaggerItem index={0}>
        <h2 className="text-2xl font-bold">What do you sell?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We'll seed pricing presets and quote templates that match your work. Pick all that apply.
        </p>
      </StaggerItem>

      <StaggerItem index={1}>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Specialties</Label>
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          {SPECIALTIES.map((s, i) => {
            const active = (state.specialties ?? []).includes(s.id);
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                style={{ animationDelay: `${(i + 2) * 50}ms` }}
                className={`opacity-0 animate-fade-in-up text-left flex items-start gap-3 p-3 rounded-lg border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    {s.label}
                    {active && <Check className="w-3.5 h-3.5 text-primary animate-scale-in" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </StaggerItem>

      <StaggerItem index={7}>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Average ticket size</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {TICKETS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => update({ avg_ticket: t.id })}
              className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
                state.avg_ticket === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </StaggerItem>

      <StaggerItem index={8}>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Typical project duration</Label>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {DURATIONS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => update({ typical_duration_days: d })}
              className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
                state.typical_duration_days === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          We'll display this on quotations and the client portal as your delivery promise.
        </p>
      </StaggerItem>
    </div>
  );
}