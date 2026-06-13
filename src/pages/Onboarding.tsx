import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Loader2, Layers } from "lucide-react";
import Step1StudioProfile from "@/components/onboarding/Step1StudioProfile";
import Step2BrandColors from "@/components/onboarding/Step2BrandColors";
import Step3Locale from "@/components/onboarding/Step3Locale";
import Step4TeamInvites from "@/components/onboarding/Step4TeamInvites";
import Step5Plan from "@/components/onboarding/Step5Plan";
import StepSpecialties from "@/components/onboarding/StepSpecialties";
import StepServiceArea from "@/components/onboarding/StepServiceArea";
import StepSuccess from "@/components/onboarding/StepSuccess";
import StepHearAboutUs from "@/components/onboarding/StepHearAboutUs";
import StepProgress from "@/components/onboarding/StepProgress";
import { invalidateTenantSettings } from "@/hooks/useTenantSettings";
import { markTourPending } from "@/hooks/useProductTour";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { openRazorpaySubscription } from "@/lib/razorpay";

export interface OnboardingState {
  // Step 1
  company_name: string;
  logo_url: string | null;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  // Step 2
  primary_color: string;
  accent_color: string;
  // Step 3
  currency: string;
  currency_symbol: string;
  timezone: string;
  fy_start_month: number;
  // Step 4 — Specialties
  specialties: string[];
  avg_ticket: string;
  typical_duration_days: number;
  // Step 5 — Service area
  service_areas: string[];
  primary_city: string;
  // Step 6 — Attribution
  hear_about_us: string;
  hear_about_us_other: string;
  primary_goal: string;
  // Step 7 — Team invites
  invites: { email: string; role: string }[];
  // Step 8 — Plan
  plan: "free" | "pro" | "studio";
  billing_cycle: "monthly" | "yearly";
  promo_locked: boolean;
}

const INITIAL: OnboardingState = {
  company_name: "",
  logo_url: null,
  phone: "",
  email: "",
  address: "",
  gstin: "",
  primary_color: "#1d4ed8",
  accent_color: "#f59e0b",
  currency: "INR",
  currency_symbol: "₹",
  timezone: "Asia/Kolkata",
  fy_start_month: 4,
  specialties: ["kitchen", "wardrobe"],
  avg_ticket: "2to5",
  typical_duration_days: 45,
  service_areas: [],
  primary_city: "",
  hear_about_us: "",
  hear_about_us_other: "",
  primary_goal: "",
  invites: [],
  plan: "free",
  billing_cycle: "monthly",
  promo_locked: false,
};

const STEPS = [
  { id: 1, label: "Studio profile" },
  { id: 2, label: "Brand colors" },
  { id: 3, label: "Currency & locale" },
  { id: 4, label: "What you sell" },
  { id: 5, label: "Where you work" },
  { id: 6, label: "How you found us" },
  { id: 7, label: "Invite team" },
  { id: 8, label: "Choose plan" },
  { id: 9, label: "All set" },
];
const TOTAL_STEPS = STEPS.length;

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<OnboardingState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  // Auth gate
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      // Pre-fill email from auth
      setState((s) => ({ ...s, email: session.user.email ?? "" }));

      // Skip onboarding only if THIS user already has a tenant + completed setup
      const { data: membership } = await supabase
        .from("tenant_members" as never)
        .select("tenant_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if ((membership as any)?.tenant_id) {
        const { data: cs } = await supabase
          .from("company_settings")
          .select("company_name, onboarding_completed_at")
          .limit(1)
          .maybeSingle();
        if (cs?.onboarding_completed_at && cs?.company_name) {
          const target = await resolvePostAuthDestination();
          navigate(target);
          return;
        }
      }
      setAuthChecked(true);
    })();
  }, [navigate]);

  const update = (patch: Partial<OnboardingState>) => setState((s) => ({ ...s, ...patch }));

  // Direction tracker for slide-in/out animation between steps
  const direction = useRef<"fwd" | "back">("fwd");
  const next = () => { direction.current = "fwd"; setStep((s) => Math.min(s + 1, TOTAL_STEPS)); };
  const back = () => { direction.current = "back"; setStep((s) => Math.max(s - 1, 1)); };

  const finish = async () => {
    setSaving(true);
    try {
      // 1. Upsert company_settings via security-definer RPC
      //    (handles role bootstrapping + bypasses RLS safely for the signed-in user)
      const payload: Record<string, unknown> = {
        company_name: state.company_name,
        logo_url: state.logo_url,
        phone: state.phone,
        email: state.email,
        address: state.address,
        gstin: state.gstin,
        primary_color: state.primary_color,
        accent_color: state.accent_color,
        currency: state.currency,
        currency_symbol: state.currency_symbol,
        timezone: state.timezone,
        fy_start_month: state.fy_start_month,
        specialties: state.specialties,
        avg_ticket: state.avg_ticket,
        typical_duration_days: state.typical_duration_days,
        service_areas: state.service_areas,
        primary_city: state.primary_city || (state.service_areas?.[0] ?? "Tirupur"),
        hear_about_us: state.hear_about_us,
        hear_about_us_other: state.hear_about_us_other,
        primary_goal: state.primary_goal,
        plan: state.plan,
        billing_cycle: state.billing_cycle,
        promo_locked: state.promo_locked,
      };
      const { error } = await supabase.rpc("complete_onboarding" as never, { payload } as never);
      if (error) throw error;

      // 2. Send team invites (best-effort, non-blocking on failure)
      for (const invite of state.invites.filter((i) => i.email)) {
        try {
          await supabase.functions.invoke("invite-team-member", {
            body: { email: invite.email, role: invite.role || "designer" },
          });
        } catch (err) {
          console.warn("invite failed", invite.email, err);
        }
      }

      invalidateTenantSettings();
      toast({ title: "You're all set!", description: `Welcome to ${state.company_name}.` });
      markTourPending();
      // Seed starter data (brands, leads, projects, vendors, finance) — best-effort.
      try {
        await supabase.functions.invoke("seed-starter-data");
      } catch (seedErr) {
        console.warn("seed-starter-data failed", seedErr);
      }
      const target = await resolvePostAuthDestination("/app");
      navigate(target);
    } catch (err: any) {
      toast({ title: "Setup failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const startSubscription = async () => {
    if (state.plan === "free") return;
    setSubscribing(true);
    try {
      // Ensure tenant + company_settings exist before creating the subscription
      // (the create-razorpay-subscription edge function requires a tenant).
      const payload = {
        company_name: state.company_name || "My Studio",
        logo_url: state.logo_url,
        phone: state.phone,
        email: state.email,
        address: state.address,
        gstin: state.gstin,
        primary_color: state.primary_color,
        accent_color: state.accent_color,
        currency: state.currency,
        currency_symbol: state.currency_symbol,
        timezone: state.timezone,
        fy_start_month: state.fy_start_month,
        specialties: state.specialties,
        avg_ticket: state.avg_ticket,
        typical_duration_days: state.typical_duration_days,
        service_areas: state.service_areas,
        primary_city: state.primary_city || (state.service_areas?.[0] ?? "Tirupur"),
        hear_about_us: state.hear_about_us,
        hear_about_us_other: state.hear_about_us_other,
        primary_goal: state.primary_goal,
      };
      const { error: ocErr } = await supabase.rpc("complete_onboarding" as never, { payload } as never);
      if (ocErr) throw ocErr;

      const { data, error } = await supabase.functions.invoke("create-razorpay-subscription", {
        body: { plan: state.plan, billing_cycle: state.billing_cycle, promo_locked: state.promo_locked },
      });
      if (error) throw error;
      const { subscription_id, key_id } = (data ?? {}) as { subscription_id: string; key_id: string };
      if (!subscription_id || !key_id) throw new Error("Razorpay subscription not created");

      await openRazorpaySubscription({
        key: key_id,
        subscription_id,
        name: state.company_name || "Chirpeel",
        description: `${state.plan === "pro" ? "Pro" : "Studio"} · ${state.billing_cycle}`,
        prefill: { email: state.email, contact: state.phone, name: state.company_name },
        theme: { color: state.primary_color || "#1d4ed8" },
        onSuccess: async () => {
          toast({ title: "Subscription authorized", description: "You're all set — welcome aboard!" });
          invalidateTenantSettings();
          markTourPending();
          try {
            await supabase.functions.invoke("seed-starter-data");
          } catch (seedErr) {
            console.warn("seed-starter-data failed", seedErr);
          }
          const target = await resolvePostAuthDestination("/app");
          navigate(target);
        },
        onDismiss: () => {
          setSubscribing(false);
          toast({ title: "Checkout closed", description: "You can resume from Settings → Billing.", variant: "destructive" });
        },
      });
    } catch (err: any) {
      toast({ title: "Couldn't start subscription", description: err.message, variant: "destructive" });
      setSubscribing(false);
    }
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 1: return !!state.company_name.trim();
      case 2: return !!state.primary_color && !!state.accent_color;
      case 3: return !!state.currency && !!state.timezone;
      case 4: return (state.specialties?.length ?? 0) > 0;
      case 5: return (state.service_areas?.length ?? 0) > 0;
      case 6:
        if (!state.hear_about_us) return false;
        if (state.hear_about_us === "other" && !state.hear_about_us_other.trim()) return false;
        return true;
      default: return true;
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Helmet><title>Set up your studio · Chirpeel</title></Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto section-padding h-14 flex items-center gap-2 font-display font-bold">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Layers className="w-4 h-4" />
          </span>
          Chirpeel
        </div>
      </header>

      <div className="container mx-auto section-padding py-8 max-w-3xl">
        {/* Progress */}
        <StepProgress steps={STEPS} current={step} />

        {/* Step content — keyed on `step` so it remounts and replays the entry animation */}
        <div
          key={`step-${step}`}
          className={`bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm opacity-0 ${
            direction.current === "back" ? "animate-slide-in-left" : "animate-fade-in-up"
          }`}
        >
          {step === 1 && <Step1StudioProfile state={state} update={update} />}
          {step === 2 && <Step2BrandColors state={state} update={update} />}
          {step === 3 && <Step3Locale state={state} update={update} />}
          {step === 4 && <StepSpecialties state={state} update={update} />}
          {step === 5 && <StepServiceArea state={state} update={update} />}
          {step === 6 && <StepHearAboutUs state={state} update={update} />}
          {step === 7 && <Step4TeamInvites state={state} update={update} />}
          {step === 8 && (
            <Step5Plan
              state={state}
              update={update}
              onSubscribe={startSubscription}
              subscribing={subscribing}
            />
          )}
          {step === 9 && (
            <StepSuccess state={state} onEnter={finish} loading={saving} />
          )}
        </div>

        {/* Nav — hidden on the success step, which has its own primary CTA */}
        {step < TOTAL_STEPS && (
          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" onClick={back} disabled={step === 1 || saving}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button onClick={next} disabled={!canAdvance()}>
              Continue <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        )}
        {step === TOTAL_STEPS && (
          <div className="flex items-center justify-start mt-6">
            <Button variant="ghost" onClick={back} disabled={saving}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
