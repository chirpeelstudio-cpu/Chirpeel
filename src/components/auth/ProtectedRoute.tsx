import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AuthLoadingOverlay from "./AuthLoadingOverlay";
import { persistRedirect, clearStoredRedirect } from "@/lib/safe-redirect";

type Status = "loading" | "guest" | "authed" | "unauthorized" | "needs-onboarding";

export default function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children?: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const resolve = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (!session) { if (mounted) setStatus("guest"); return; }
      if (!requireAdmin) { if (mounted) setStatus("authed"); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!mounted) return;
      if (data) { setStatus("authed"); return; }
      // Not an admin — check whether onboarding still needs to happen.
      // If so, route them through onboarding instead of showing a scary
      // "Access restricted" screen (the first user becomes admin via
      // complete_onboarding RPC).
      const { data: cs } = await supabase
        .from("company_settings")
        .select("company_name, onboarding_completed_at")
        .limit(1)
        .maybeSingle();
      const onboarded = !!(cs?.onboarding_completed_at && cs?.company_name);
      if (!mounted) return;
      setStatus(onboarded ? "unauthorized" : "needs-onboarding");
    };
    supabase.auth.getSession().then(({ data: { session } }) => resolve(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      resolve(session);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [requireAdmin]);

  if (status === "loading") {
    return <AuthLoadingOverlay message={requireAdmin ? "Verifying admin access…" : "Checking your session…"} />;
  }
  if (status === "guest") {
    const target = location.pathname + location.search;
    persistRedirect(target);
    const redirect = encodeURIComponent(target);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (status === "needs-onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  if (status === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-lg text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">Access restricted</h1>
            <p className="text-sm text-muted-foreground">
              This area is for administrators only. Contact your admin if you believe this is a mistake.
            </p>
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" onClick={() => navigate("/profile", { replace: true })}>Go to your profile</Button>
            <Button
              onClick={async () => {
                if (signingOut) return;
                setSigningOut(true);
                await supabase.auth.signOut();
                clearStoredRedirect();
                navigate("/login?redirect=/", { replace: true });
              }}
              disabled={signingOut}
              aria-busy={signingOut}
            >
              {signingOut ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing out…</>
              ) : "Sign out"}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return <>{children ?? <Outlet />}</>;
}