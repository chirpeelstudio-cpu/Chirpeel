import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { OnboardingState } from "@/pages/Onboarding";

const PRESETS: { name: string; primary: string; accent: string }[] = [
  { name: "Indigo & Amber",  primary: "#1d4ed8", accent: "#f59e0b" },
  { name: "Charcoal & Gold", primary: "#1f2937", accent: "#d4af37" },
  { name: "Forest & Cream",  primary: "#15803d", accent: "#fde68a" },
  { name: "Plum & Rose",     primary: "#7e22ce", accent: "#fb7185" },
  { name: "Slate & Teal",    primary: "#334155", accent: "#0d9488" },
  { name: "Terracotta",      primary: "#9a3412", accent: "#fbbf24" },
];

interface Props {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}

export default function Step2BrandColors({ state, update }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Brand colors</h2>
        <p className="text-sm text-muted-foreground mt-1">Used in your client portal, PDFs, and email templates.</p>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quick presets</Label>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => update({ primary_color: p.primary, accent_color: p.accent })}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                state.primary_color === p.primary && state.accent_color === p.accent
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-foreground/30"
              }`}>
              <div className="flex gap-1">
                <span className="block w-5 h-5 rounded-full border border-border" style={{ background: p.primary }} />
                <span className="block w-5 h-5 rounded-full border border-border" style={{ background: p.accent }} />
              </div>
              <span className="text-xs font-medium">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div>
          <Label htmlFor="primary">Primary color</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id="primary" type="color" value={state.primary_color}
              onChange={(e) => update({ primary_color: e.target.value })}
              className="h-10 w-14 rounded border border-border cursor-pointer"
            />
            <Input value={state.primary_color} onChange={(e) => update({ primary_color: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="accent">Accent color</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id="accent" type="color" value={state.accent_color}
              onChange={(e) => update({ accent_color: e.target.value })}
              className="h-10 w-14 rounded border border-border cursor-pointer"
            />
            <Input value={state.accent_color} onChange={(e) => update({ accent_color: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="p-5 rounded-xl border border-border bg-muted/40">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Preview</div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: state.primary_color }}>
            Primary button
          </div>
          <div className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ background: state.accent_color, color: "#1f2937", borderColor: state.accent_color }}>
            Accent badge
          </div>
          <div className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: `${state.primary_color}15`, color: state.primary_color }}>
            Status pill
          </div>
        </div>
      </div>
    </div>
  );
}
