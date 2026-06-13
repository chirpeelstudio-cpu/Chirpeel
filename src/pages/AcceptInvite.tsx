import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type State = "loading" | "needs_signup" | "needs_login" | "ready" | "accepting" | "done" | "error";

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [invite, setInvite] = useState<{ email: string; name: string | null; proposed_role: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setState("error"); setError("Missing invite token"); return; }
    (async () => {
      const { data, error: e } = await supabase
        .from("team_invites")
        .select("email, name, proposed_role")
        .eq("token", token).maybeSingle();
      if (e || !data) { setState("error"); setError("Invite is invalid or expired"); return; }
      setInvite(data as never);
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setState("needs_signup"); return; }
      if (u.user.email?.toLowerCase() !== (data as { email: string }).email.toLowerCase()) {
        setState("error");
        setError(`You're signed in as ${u.user.email}, but this invite is for ${(data as { email: string }).email}. Please sign out and sign in with the correct email.`);
        return;
      }
      setState("ready");
    })();
  }, [token]);

  const accept = async () => {
    setState("accepting");
    const { error: e } = await supabase.rpc("accept_team_invite", { _token: token });
    if (e) { setState("error"); setError(e.message); return; }
    setState("done");
    setTimeout(() => navigate("/studio/overview"), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8 space-y-4">
        <h1 className="text-2xl font-bold">Team invitation</h1>
        {state === "loading" && <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking invite…</p>}
        {invite && state !== "loading" && state !== "error" && (
          <p className="text-sm text-muted-foreground">
            You've been invited as <strong>{invite.proposed_role}</strong>{invite.name ? ` (${invite.name})` : ""} using <strong>{invite.email}</strong>.
          </p>
        )}
        {state === "needs_signup" && (
          <div className="space-y-3">
            <p className="text-sm">Create an account or sign in with <strong>{invite?.email}</strong> to accept.</p>
            <div className="flex gap-2">
              <Button asChild className="flex-1"><Link to={`/signup?email=${encodeURIComponent(invite?.email ?? "")}&invite=${token}`}>Create account</Link></Button>
              <Button asChild variant="outline" className="flex-1"><Link to={`/login?invite=${token}`}>Sign in</Link></Button>
            </div>
          </div>
        )}
        {state === "ready" && (
          <Button className="w-full" onClick={accept}>Accept invite</Button>
        )}
        {state === "accepting" && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Joining studio…</p>}
        {state === "done" && (
          <p className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-5 w-5" /> Welcome aboard! Redirecting…</p>
        )}
        {state === "error" && (
          <p className="flex items-start gap-2 text-destructive text-sm"><AlertCircle className="h-5 w-5 shrink-0" /> {error}</p>
        )}
      </Card>
    </div>
  );
}