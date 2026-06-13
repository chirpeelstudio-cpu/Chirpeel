import { Check, Sparkles, Database, Compass, Settings as SettingsIcon, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import StaggerItem from "./StaggerItem";
import type { OnboardingState } from "@/pages/Onboarding";

interface Props {
  state: OnboardingState;
  onEnter: () => void;
  loading: boolean;
}

export default function StepSuccess({ state, onEnter, loading }: Props) {
  const inviteCount = state.invites.filter(i => i.email.trim()).length;
  const cityCount = (state.service_areas ?? []).length;
  const planLabel = state.plan === "free" ? "Free" : state.plan === "pro" ? "Pro" : "Studio";

  return (
    <div className="text-center space-y-5">
      {/* Animated checkmark */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center animate-scale-in shadow-lg shadow-primary/30">
            <Check className="w-10 h-10" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 rounded-full animate-pulse-glow" />
        </div>
      </div>

      <StaggerItem index={1}>
        <h2 className="text-2xl sm:text-3xl font-bold">You're all set!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Welcome to <span className="font-semibold text-foreground">{state.company_name || "your studio"}</span>.
          Here's a quick recap of what we just configured.
        </p>
      </StaggerItem>

      {/* Summary chips */}
      <StaggerItem index={2}>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <SummaryChip label="Plan" value={planLabel} />
          <SummaryChip label="Specialties" value={`${(state.specialties ?? []).length} picked`} />
          <SummaryChip label="Cities" value={cityCount > 0 ? `${cityCount}` : "—"} />
          <SummaryChip label="Teammates invited" value={`${inviteCount}`} />
          <SummaryChip label="Delivery" value={`${state.typical_duration_days ?? 45} days`} />
        </div>
      </StaggerItem>

      {/* What happens next */}
      <div className="text-left space-y-2 pt-2 max-w-md mx-auto">
        <NextItem
          index={3}
          icon={Database}
          title="Sample data is loading"
          desc="55 brands, 3 demo leads, 2 projects and 4 vendors so you can explore."
        />
        <NextItem
          index={4}
          icon={Compass}
          title="A guided tour will start"
          desc="A 28-step walkthrough explains every tool. Skip anytime with Esc."
        />
        <NextItem
          index={5}
          icon={SettingsIcon}
          title="Change anything in Settings"
          desc="Brand, pricing, pipeline stages, GST — all editable later."
        />
      </div>

      <StaggerItem index={6}>
        <Button onClick={onEnter} disabled={loading} size="lg" className="mt-3 w-full sm:w-auto px-8 group">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up your studio…</>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Enter your studio
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </StaggerItem>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold text-foreground">{value}</span>
    </span>
  );
}

function NextItem({
  index, icon: Icon, title, desc,
}: {
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <StaggerItem index={index}>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
        <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0 text-left">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
    </StaggerItem>
  );
}