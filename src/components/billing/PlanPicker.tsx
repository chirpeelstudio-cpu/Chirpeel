import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { openRazorpaySubscription } from "@/lib/razorpay";
import { refreshEntitlements } from "@/hooks/useEntitlements";
import type { PlanId } from "@/lib/planEntitlements";

type Cycle = "monthly" | "yearly";

interface PlanCard {
  id: Exclude<PlanId, "free">;
  name: string;
  monthlyPrice: number;
  features: string[];
  recommended?: boolean;
}

const PLANS: PlanCard[] = [
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 2499,
    features: [
      "5 team members",
      "Unlimited leads & quotations",
      "25 active projects",
      "WhatsApp + Email send",
      "Vendor management",
    ],
    recommended: true,
  },
  {
    id: "studio",
    name: "Studio",
    monthlyPrice: 5999,
    features: [
      "25 team members",
      "Unlimited projects",
      "Custom PDF themes",
      "Activity log + audit",
      "Webhooks + API",
    ],
  },
];

const YEARLY_DISCOUNT = 0.2;
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function priceFor(plan: PlanCard, cycle: Cycle) {
  if (cycle === "yearly") {
    const yearly = Math.round(plan.monthlyPrice * 12 * (1 - YEARLY_DISCOUNT));
    return { display: fmt(Math.round(yearly / 12)) + "/mo", suffix: `billed ${fmt(yearly)}/yr` };
  }
  return { display: fmt(plan.monthlyPrice) + "/mo", suffix: "billed monthly" };
}

interface Props {
  /** Highlight which plan is the user's current subscription. */
  currentPlan?: PlanId | null;
  /** Optional: focus a specific plan (e.g. when launched from an UpgradeDialog). */
  preselect?: Exclude<PlanId, "free">;
  onSubscribed?: () => void;
}

export default function PlanPicker({ currentPlan, preselect, onSubscribed }: Props) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [busy, setBusy] = useState<string | null>(null);

  const subscribe = async (planId: Exclude<PlanId, "free">) => {
    setBusy(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-razorpay-subscription", {
        body: { plan: planId, billing_cycle: cycle, promo_locked: false },
      });
      if (error || (data as { error?: string })?.error) {
        toast({
          title: "Could not start checkout",
          description: (data as { error?: string })?.error ?? error?.message ?? "Try again",
          variant: "destructive",
        });
        return;
      }
      const payload = data as { subscription_id: string; key_id: string; short_url?: string };
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email ?? undefined;

      await openRazorpaySubscription({
        key: payload.key_id,
        subscription_id: payload.subscription_id,
        name: "Chirpeel Studio",
        description: `${planId === "pro" ? "Pro" : "Studio"} · ${cycle === "yearly" ? "Yearly" : "Monthly"}`,
        prefill: { email },
        onSuccess: () => {
          toast({
            title: "Subscription activated",
            description: "Your plan is being provisioned. Limits will lift shortly.",
          });
          refreshEntitlements();
          onSubscribed?.();
        },
        onDismiss: () => setBusy(null),
      });
    } catch (e) {
      toast({
        title: "Checkout failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold">Choose a plan</h3>
          <p className="text-xs text-muted-foreground">Cancel anytime. Yearly billing saves 20%.</p>
        </div>
        <div className="inline-flex items-center bg-muted p-1 rounded-full text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              cycle === "monthly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              cycle === "yearly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            Yearly <Badge variant="secondary" className="text-[10px]">−20%</Badge>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
          const isFocus = preselect === p.id;
          const price = priceFor(p, cycle);
          return (
            <div
              key={p.id}
              className={`relative rounded-lg border p-4 flex flex-col gap-3 transition-all ${
                isFocus
                  ? "border-primary ring-2 ring-primary/30"
                  : p.recommended
                  ? "border-primary/40"
                  : "border-border"
              }`}
            >
              {p.recommended && (
                <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground gap-1">
                  <Sparkles className="w-3 h-3" /> Recommended
                </Badge>
              )}
              <div>
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-xl font-bold mt-1">{price.display}</p>
                <p className="text-xs text-muted-foreground">{price.suffix}</p>
              </div>
              <ul className="space-y-1.5 text-xs">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => subscribe(p.id)}
                disabled={busy !== null || isCurrent}
                variant={p.recommended || isFocus ? "default" : "outline"}
                className="w-full mt-auto"
              >
                {busy === p.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCurrent ? (
                  "Current plan"
                ) : (
                  `Upgrade to ${p.name}`
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}