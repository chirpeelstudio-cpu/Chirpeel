import { Search, Instagram, Youtube, Users, CalendarHeart, Star, MoreHorizontal, Check, Target, FileText, Briefcase, Wallet, Compass } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import StaggerItem from "./StaggerItem";
import type { OnboardingState } from "@/pages/Onboarding";

interface Props {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}

const SOURCES = [
  { id: "google",     label: "Google search",            icon: Search,         desc: "Found us via search" },
  { id: "social",     label: "Instagram / Facebook",     icon: Instagram,      desc: "Saw a post or ad" },
  { id: "youtube",    label: "YouTube",                  icon: Youtube,        desc: "Watched a demo or review" },
  { id: "referral",   label: "Friend or colleague",      icon: Users,          desc: "Someone recommended us" },
  { id: "event",      label: "Industry event / expo",    icon: CalendarHeart,  desc: "Met us in person" },
  { id: "customer",   label: "Existing Chirpeel user",   icon: Star,           desc: "I already use Chirpeel" },
  { id: "other",      label: "Other",                    icon: MoreHorizontal, desc: "Tell us how" },
] as const;

const GOALS = [
  { id: "leads",    label: "Win more leads",     icon: Target },
  { id: "quotes",   label: "Send quotes faster", icon: FileText },
  { id: "projects", label: "Manage projects",    icon: Briefcase },
  { id: "payments", label: "Track payments",     icon: Wallet },
  { id: "explore",  label: "Just exploring",     icon: Compass },
] as const;

export default function StepHearAboutUs({ state, update }: Props) {
  const isOther = state.hear_about_us === "other";

  return (
    <div className="space-y-6">
      <StaggerItem index={0}>
        <h2 className="text-2xl font-bold">How did you hear about us?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Helps us understand what's working — and personalise the next few screens for you.
        </p>
      </StaggerItem>

      <StaggerItem index={1}>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Discovery source</Label>
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          {SOURCES.map((s, i) => {
            const active = state.hear_about_us === s.id;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => update({ hear_about_us: s.id })}
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

        {isOther && (
          <div className="mt-3 animate-fade-in-up">
            <Label htmlFor="hear_about_us_other" className="text-xs text-muted-foreground">
              Please tell us where
            </Label>
            <Input
              id="hear_about_us_other"
              className="mt-1.5"
              placeholder="e.g. Reddit, podcast, blog post…"
              value={state.hear_about_us_other}
              onChange={(e) => update({ hear_about_us_other: e.target.value })}
              autoFocus
            />
          </div>
        )}
      </StaggerItem>

      <StaggerItem index={10}>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          What do you most want to do first? <span className="font-normal normal-case text-muted-foreground/70">(optional)</span>
        </Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {GOALS.map((g, i) => {
            const active = state.primary_goal === g.id;
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => update({ primary_goal: active ? "" : g.id })}
                style={{ animationDelay: `${(i + 11) * 40}ms` }}
                className={`opacity-0 animate-fade-in-up inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm font-medium transition-all hover:scale-[1.03] active:scale-[0.97] ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {g.label}
                {active && <Check className="w-3.5 h-3.5 animate-scale-in" />}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          We'll surface a quick-win shortcut for this on your dashboard.
        </p>
      </StaggerItem>
    </div>
  );
}