import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarClock, CreditCard, ExternalLink, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useCurrentUserPermissions } from "@/hooks/useCurrentUserPermissions";
import PlanPicker from "./PlanPicker";
import ChargeHistory from "./ChargeHistory";
import { useEffect as useEffectReact } from "react";

type Sub = {
  id: string;
  plan: string;
  billing_cycle: string;
  status: string;
  current_start: string | null;
  current_end: string | null;
  promo_locked: boolean;
  razorpay_subscription_id: string;
  short_url: string | null;
};

const PLAN_LABEL: Record<string, string> = { free: "Free", pro: "Pro", studio: "Studio" };
const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  authenticated: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  created: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  halted: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  completed: "bg-muted text-muted-foreground border-border",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch { return d; }
}

export default function BillingPanel() {
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<Sub | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const { isAdmin } = useCurrentUserPermissions();

  // Auto-scroll to picker when arriving via #upgrade hash.
  useEffectReact(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#upgrade") {
      requestAnimationFrame(() => {
        document.getElementById("billing-upgrade")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_my_subscription");
    if (error) {
      console.error(error);
      setSub(null);
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      setSub((row as Sub) ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (atCycleEnd: boolean) => {
    if (!sub) return;
    setCancelling(true);
    const { data, error } = await supabase.functions.invoke("cancel-razorpay-subscription", {
      body: { subscription_id: sub.razorpay_subscription_id, cancel_at_cycle_end: atCycleEnd },
    });
    setCancelling(false);
    if (error || (data as { error?: string })?.error) {
      toast({
        title: "Could not cancel",
        description: (data as { error?: string })?.error ?? error?.message ?? "Try again later",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: atCycleEnd ? "Cancellation scheduled" : "Subscription cancelled",
      description: atCycleEnd ? "Your plan will end at the current billing cycle." : "Your plan has been cancelled.",
    });
    load();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (!sub) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Billing</CardTitle>
            <CardDescription>You're on the Free plan. Upgrade for unlimited leads, quotations, and more projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Free plan · No active subscription</Badge>
          </CardContent>
        </Card>
        <Card id="billing-upgrade">
          <CardContent className="pt-6">
            <PlanPicker currentPlan="free" onSubscribed={load} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const planLabel = PLAN_LABEL[sub.plan] ?? sub.plan;
  const cycleLabel = sub.billing_cycle === "yearly" ? "Yearly" : "Monthly";
  const statusClass = STATUS_TONE[sub.status] ?? "bg-muted text-muted-foreground border-border";
  const isLive = ["active", "authenticated"].includes(sub.status);
  const isClosed = ["cancelled", "completed"].includes(sub.status);

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Billing
            </CardTitle>
            <CardDescription>Your current plan and renewal details.</CardDescription>
          </div>
          <Badge className={`border ${statusClass} capitalize`}>{sub.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan</p>
            <p className="text-base font-semibold mt-1">{planLabel}</p>
            <p className="text-xs text-muted-foreground">{cycleLabel} billing</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Current cycle</p>
            <p className="text-sm font-medium mt-1">{formatDate(sub.current_start)}</p>
            <p className="text-xs text-muted-foreground">started</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CalendarClock className="w-3 h-3" /> Next renewal
            </p>
            <p className="text-sm font-medium mt-1">{formatDate(sub.current_end)}</p>
            <p className="text-xs text-muted-foreground">{isClosed ? "ended" : "auto-renews"}</p>
          </div>
        </div>

        {sub.promo_locked && (
          <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              50% promotional discount is locked in for your subscription.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {sub.short_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={sub.short_url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4" /> View on Razorpay
              </a>
            </Button>
          )}
          {isAdmin && isLive && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={cancelling}>
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Cancel subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You can end it immediately, or let it run until the current billing cycle finishes
                    on <strong>{formatDate(sub.current_end)}</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel>Keep plan</AlertDialogCancel>
                  <Button variant="outline" onClick={() => handleCancel(true)} disabled={cancelling}>
                    Cancel at cycle end
                  </Button>
                  <AlertDialogAction onClick={() => handleCancel(false)} disabled={cancelling}>
                    Cancel now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {!isAdmin && isLive && (
          <p className="text-xs text-muted-foreground">
            Only an admin in your studio can cancel or change the plan.
          </p>
        )}
      </CardContent>
    </Card>
    {isAdmin && isClosed && (
      <Card id="billing-upgrade" className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Reactivate your plan</CardTitle>
          <CardDescription>Pick a plan to start a new subscription.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanPicker currentPlan={sub.plan as "free" | "pro" | "studio"} onSubscribed={load} />
        </CardContent>
      </Card>
    )}
    {isAdmin && isLive && (
      <Card id="billing-upgrade" className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Change plan</CardTitle>
          <CardDescription>Upgrade now — your existing plan ends at the cycle close.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanPicker currentPlan={sub.plan as "free" | "pro" | "studio"} onSubscribed={load} />
        </CardContent>
      </Card>
    )}
    <div className="mt-4">
      <ChargeHistory />
    </div>
    </>
  );
}