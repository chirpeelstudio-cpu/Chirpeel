import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Lock, Mail, Sparkles } from "lucide-react";
import {
  clearStoredRedirect,
  persistRedirect,
  resolveRedirect,
  safeRedirectTarget,
} from "@/lib/safe-redirect";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/auth/TurnstileWidget";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Single source of truth: prefer ?redirect=, then localStorage, then /app.
  // Always validated through safeRedirectTarget.
  const redirectTo = resolveRedirect(params.get("redirect"), "/app");

  // Mirror the resolved target into storage so it survives the OAuth round-trip
  // (provider redirect, possibly in a new tab, then back to /login).
  useEffect(() => {
    if (redirectTo && redirectTo !== "/app") persistRedirect(redirectTo);
  }, [redirectTo]);

  // If a session already exists when we land here (e.g. OAuth completed in
  // another tab and Supabase synced via storage events), forward immediately.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled || !session) return;
      const target = await resolvePostAuthDestination(params.get("redirect"));
      clearStoredRedirect();
      navigate(target, { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session) return;
      const target = await resolvePostAuthDestination(params.get("redirect"));
      clearStoredRedirect();
      navigate(target, { replace: true });
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      toast({ title: "Please wait", description: "Verifying you're human…" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    setLoading(false);
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    // onAuthStateChange listener above will pick this up and forward to the
    // correct destination based on onboarding state + role.
    const target = await resolvePostAuthDestination(params.get("redirect"));
    clearStoredRedirect();
    navigate(target, { replace: true });
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setEmail("demostudio729203@wshu.net");
    setPassword("ChirpeelDemo@2026!");
    const { error } = await supabase.auth.signInWithPassword({
      email: "demostudio729203@wshu.net",
      password: "ChirpeelDemo@2026!",
    });
    setLoading(false);
    if (error) {
      toast({ title: "Demo login failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Welcome to the demo!", description: "Exploring the Studio dashboard." });
    clearStoredRedirect();
    navigate("/studio", { replace: true });
  };

  const handleGoogle = async () => {
    // Persist target BEFORE leaving the page. Do NOT clear it — the callback
    // (possibly in a new tab) needs to read it back from localStorage.
    persistRedirect(redirectTo);
    // Always send the OAuth callback to /login so a single place handles
    // session detection + safe redirect resolution. This avoids landing on a
    // page that doesn't know how to consume the persisted target.
    const callback = `${window.location.origin}/login?redirect=${encodeURIComponent(redirectTo)}`;
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: callback,
    });
    if (result.redirected) return; // browser is leaving — keep storage intact
    if (result.error) {
      toast({ title: "Google sign-in failed", description: result.error.message, variant: "destructive" });
      return;
    }
    // Tokens returned inline (rare path) — forward immediately.
    const target = await resolvePostAuthDestination(redirectTo);
    clearStoredRedirect();
    navigate(target, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-lg space-y-6">
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Admin Login</h1>
          <p className="text-sm text-muted-foreground">Sign in to view leads</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="pl-10" required />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="pl-10" required />
          </div>
        </div>

        <TurnstileWidget
          ref={turnstileRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
          onError={() => setCaptchaToken(null)}
        />
        <Button type="submit" className="w-full" disabled={loading || !captchaToken}>
          {loading ? "Signing in…" : "Sign In"}
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.34-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          Continue with Google
        </Button>

        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Try Demo Account
          </Button>
          <div className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Instantly explore the Studio dashboard.<br />
            <span className="font-mono text-[10px]">demostudio729203@wshu.net</span> · <span className="font-mono text-[10px]">ChirpeelDemo@2026!</span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminLogin;
