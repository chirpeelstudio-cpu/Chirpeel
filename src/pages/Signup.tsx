import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Layers, Loader2, Mail, Lock, User } from "lucide-react";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/auth/TurnstileWidget";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/onboarding`,
    });
    if (result.redirected) return;
    if (result.error) {
      toast({ title: "Google sign-in failed", description: result.error.message, variant: "destructive" });
      return;
    }
    navigate("/onboarding");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      toast({ title: "Please wait", description: "Verifying you're human…" });
      return;
    }
    setLoading(true);

    // Call the rate-limited signup edge function.
    // It enforces: max 3 signups per IP per hour + server-side Turnstile verify.
    const { data, error } = await supabase.functions.invoke("signup-with-rate-limit", {
      body: {
        email,
        password,
        full_name: fullName,
        captcha_token: captchaToken,
      },
    });

    setLoading(false);
    // Token is single-use — always reset.
    turnstileRef.current?.reset();
    setCaptchaToken(null);

    if (error) {
      // supabase.functions.invoke wraps non-2xx responses in error.context (a Response).
      let message = error.message ?? "Sign up failed";
      let isRateLimit = false;
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          const payload = await ctx.json();
          if (payload?.error) message = payload.error;
          if (payload?.rate_limited) isRateLimit = true;
        }
      } catch { /* ignore parse errors, fall back to default message */ }

      toast({
        title: isRateLimit ? "Too many attempts" : "Sign up failed",
        description: message,
        variant: "destructive",
      });
      return;
    }

    // Hydrate the session locally so the user is signed in immediately.
    if (data?.session?.access_token && data?.session?.refresh_token) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      toast({ title: "Welcome!", description: "Let's set up your studio." });
      const target = await resolvePostAuthDestination("/onboarding");
      navigate(target);
    } else {
      toast({ title: "Check your email", description: "Confirm your email to continue." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <Helmet><title>Create your account · Chirpeel</title></Helmet>
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-lg space-y-6">
        <div className="text-center space-y-1">
          <Link to="/" className="inline-flex items-center gap-2 mb-3 font-display font-bold">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
              <Layers className="w-4 h-4" />
            </span>
            Chirpeel
          </Link>
          <h1 className="text-xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground">Set up your studio in 5 minutes.</p>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="full_name">Your name</Label>
            <div className="relative mt-1.5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" placeholder="Anita Sharma" />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="you@studio.com" />
            </div>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="Minimum 8 characters" />
            </div>
          </div>
        </div>
        <TurnstileWidget
          ref={turnstileRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
          onError={() => setCaptchaToken(null)}
        />
        <Button type="submit" disabled={loading || !captchaToken} className="w-full">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</> : "Create account"}
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
        <p className="text-center text-xs text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
