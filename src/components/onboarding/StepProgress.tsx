import { Check } from "lucide-react";

export interface StepProgressItem {
  id: number;
  label: string;
}

interface StepProgressProps {
  steps: StepProgressItem[];
  current: number;
}

/**
 * Animated step progress indicator for the onboarding wizard.
 * - Smooth fill bar with shimmer
 * - Mobile: shows current/next labels + horizontally scrollable pip rail
 * - Desktop: full labelled stepper with check / active / pending states
 */
export default function StepProgress({ steps, current }: StepProgressProps) {
  const total = steps.length;
  const pct = Math.round((current / total) * 100);
  const currentStep = steps.find((s) => s.id === current);
  const nextStep = steps.find((s) => s.id === current + 1);

  return (
    <div className="mb-8">
      {/* Header row */}
      <div className="flex items-end justify-between mb-2 gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            Step {current} of {total}
          </div>
          <div
            key={`title-${current}`}
            className="text-sm sm:text-base font-display font-semibold text-foreground truncate animate-fade-in-up"
          >
            {currentStep?.label}
          </div>
          {nextStep && (
            <div
              key={`next-${current}`}
              className="text-[11px] text-muted-foreground truncate animate-fade-in-up"
              style={{ animationDelay: "60ms" }}
            >
              Up next · {nextStep.label}
            </div>
          )}
        </div>
        <div
          key={`pct-${current}`}
          className="text-xs font-bold text-primary tabular-nums animate-scale-in shrink-0"
        >
          {pct}%
        </div>
      </div>

      {/* Fill bar */}
      <div
        className="h-2 bg-muted rounded-full overflow-hidden relative"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Onboarding progress: ${pct}%`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-accent rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
        <div
          key={`shimmer-${current}`}
          className="absolute inset-y-0 left-0 bg-primary/40 rounded-full animate-pulse-glow"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Pip rail — horizontally scrollable on mobile, full row on desktop */}
      <div className="mt-4 flex sm:justify-between gap-2 sm:gap-1 overflow-x-auto scrollbar-none -mx-1 px-1 snap-x">
        {steps.map((s) => {
          const done = s.id < current;
          const active = s.id === current;
          const stateKey = active ? "a" : done ? "d" : "p";
          return (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 shrink-0 snap-start transition-colors duration-300 ${
                s.id <= current
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              <span
                key={`${s.id}-${stateKey}`}
                className={`relative inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all duration-300 ${
                  done
                    ? "bg-primary text-primary-foreground animate-scale-in shadow-sm"
                    : active
                    ? "bg-primary/15 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : s.id}
                {active && (
                  <span className="absolute inset-0 rounded-full border-2 border-primary animate-tour-pulse-ring pointer-events-none" />
                )}
              </span>
              <span className="hidden sm:inline whitespace-nowrap text-[11px]">
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}