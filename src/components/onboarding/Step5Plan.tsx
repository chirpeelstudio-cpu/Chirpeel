import { Check, Sparkles, ArrowRight, Loader2, CreditCard } from "lucide-react";
import type { OnboardingState } from "@/pages/Onboarding";

type PlanId = "free" | "pro" | "studio";

interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number; // INR per month
  features: string[];
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    features: ["1 team member", "25 leads / month", "5 quotations / month", "2 active projects"],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 2499,
    features: ["5 team members", "Unlimited leads & quotations", "25 active projects", "WhatsApp + Email send", "Vendor management"],
    recommended: true,
  },
  {
    id: "studio",
    name: "Studio",
    monthlyPrice: 5999,
    features: ["25 team members", "Custom PDF themes", "Activity log + audit", "Webhooks + API"],
  },
];

const YEARLY_DISCOUNT = 0.2; // 20% off when billed yearly
const FREE_UPSELL_DISCOUNT = 0.5; // 50% off first 2 months when user picks Free

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

interface Props {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  onSubscribe?: () => void | Promise<void>;
  subscribing?: boolean;
}

export default function Step5Plan({ state, update, onSubscribe, subscribing }: Props) {
  const cycle = state.billing_cycle;
  // Promo discount sticks once unlocked (when user lands on Free or clicks a discounted card),
  // so switching to Pro/Studio keeps the half-price they were shown.
  const promoEligible = cycle === "monthly" && (state.plan === "free" || state.promo_locked);
  const showUpsellBanner = state.plan === "free" && cycle === "monthly";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Pick your plan</h2>
          <p className="text-sm text-muted-foreground mt-1">Start free — upgrade anytime from Settings → Billing.</p>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="inline-flex items-center bg-muted p-1 rounded-full text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => update({ billing_cycle: "monthly" })}
            className={`px-4 py-1.5 rounded-full transition-all ${
              cycle === "monthly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => update({ billing_cycle: "yearly" })}
            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              cycle === "yearly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <span className="text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {PLANS.map((p) => {
          const active = state.plan === p.id;
          const isFree = p.id === "free";

          // Compute display price
          let originalPerMonth = p.monthlyPrice;
          let displayPerMonth = p.monthlyPrice;
          let strikeThrough: number | null = null;
          let promoLabel: string | null = null;
          let periodLabel = isFree ? "forever" : "/ month";

          if (!isFree) {
            if (cycle === "yearly") {
              displayPerMonth = Math.round(p.monthlyPrice * (1 - YEARLY_DISCOUNT));
              strikeThrough = p.monthlyPrice;
              periodLabel = "/ mo · billed yearly";
              promoLabel = `Save ${fmt((p.monthlyPrice - displayPerMonth) * 12)} a year`;
            } else if (promoEligible) {
              displayPerMonth = Math.round(p.monthlyPrice * (1 - FREE_UPSELL_DISCOUNT));
              strikeThrough = p.monthlyPrice;
              promoLabel = "50% off · first 2 months";
            }
          }

          return (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                update(
                  // Lock in the promo when user picks a paid plan while the discount is on offer
                  !isFree && promoEligible
                    ? { plan: p.id, promo_locked: true }
                    : { plan: p.id },
                )
              }
              className={`text-left p-5 rounded-xl border transition-all relative ${
                active
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                  : "border-border hover:border-foreground/30 bg-card"
              }`}
            >
              {p.recommended && (
                <span className="absolute -top-2 right-3 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              )}
              <div className="font-bold text-lg">{p.name}</div>

              <div className="mt-2 mb-1 flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold">{fmt(displayPerMonth)}</span>
                {strikeThrough !== null && (
                  <span className="text-sm text-muted-foreground line-through">{fmt(strikeThrough)}</span>
                )}
                <span className="text-xs text-muted-foreground">{periodLabel}</span>
              </div>

              {promoLabel && (
                <div
                  key={promoLabel /* re-trigger animation when label changes */}
                  className="mb-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full animate-fade-in"
                >
                  <Sparkles className="w-3 h-3" />
                  {promoLabel}
                </div>
              )}
              {!promoLabel && !isFree && <div className="mb-3" />}

              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="text-xs flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Upsell banner — shown only when Free is selected on monthly */}
      {showUpsellBanner && (
        <div className="p-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <Sparkles className="w-4 h-4 text-primary" />
              Limited offer — 50% off Pro for your first 2 months
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unlock unlimited leads, quotations & WhatsApp send for just{" "}
              <strong className="text-foreground">{fmt(Math.round(2499 * 0.5))}/mo</strong>. Cancel anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={() => update({ plan: "pro", promo_locked: true })}
            className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Switch to Pro <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {state.plan !== "free" && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 text-xs text-foreground">
            <strong>Recurring billing via Razorpay.</strong> You'll authorize a{" "}
            {cycle === "monthly" ? "monthly" : "yearly"} auto-charge for the{" "}
            {state.plan === "pro" ? "Pro" : "Studio"} plan
            {cycle === "monthly" && promoEligible ? " at 50% off for the first 2 months" : ""}
            {cycle === "yearly" ? " (20% yearly discount applied)" : ""}. Cancel anytime.
          </div>
          {onSubscribe && (
            <button
              type="button"
              onClick={() => onSubscribe()}
              disabled={!!subscribing}
              className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-60"
            >
              {subscribing ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening Razorpay…</>
              ) : (
                <><CreditCard className="w-3.5 h-3.5" /> Pay with Razorpay</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
