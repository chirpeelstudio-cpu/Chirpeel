// Signup with IP rate limiting + Turnstile verification.
// Public endpoint — no JWT required (signup is unauthenticated by definition).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATE_LIMIT_PER_HOUR = 3;
const WINDOW_MINUTES = 60;

interface SignupBody {
  email: string;
  password: string;
  full_name: string;
  captcha_token: string;
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    // Leftmost is the original client IP (Cloudflare/Lovable proxy guarantees this)
    return xff.split(",")[0].trim();
  }
  return req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.error("[signup] TURNSTILE_SECRET_KEY not configured");
    return false;
  }
  try {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    if (ip && ip !== "unknown") form.append("remoteip", ip);
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const data = await res.json();
    if (!data.success) {
      console.warn("[signup] Turnstile rejected:", data["error-codes"]);
    }
    return data.success === true;
  } catch (e) {
    console.error("[signup] Turnstile verify error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";

  // Parse + validate input
  let body: SignupBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const fullName = (body.full_name ?? "").trim();
  const captchaToken = body.captcha_token ?? "";

  if (!email || !email.includes("@") || email.length > 255) {
    return json({ error: "Valid email is required" }, 400);
  }
  if (!password || password.length < 8 || password.length > 200) {
    return json({ error: "Password must be 8–200 characters" }, 400);
  }
  if (!fullName || fullName.length > 100) {
    return json({ error: "Name is required (max 100 chars)" }, 400);
  }
  if (!captchaToken) {
    return json({ error: "Verification required. Please complete the captcha." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Check rate limit BEFORE doing anything expensive
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error: countErr } = await supabase
    .from("signup_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("attempted_at", windowStart);

  if (countErr) {
    console.error("[signup] rate-limit check failed:", countErr);
    // Fail open — don't block legit users due to a DB blip
  } else if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    console.warn(`[signup] rate limit hit for IP ${ip}: ${count} attempts`);
    return json(
      {
        error: "Too many signup attempts from your network. Please try again in an hour.",
        rate_limited: true,
        retry_after_minutes: WINDOW_MINUTES,
      },
      429,
      { "Retry-After": String(WINDOW_MINUTES * 60) }
    );
  }

  // 2. Verify Turnstile (server-side — can't be bypassed)
  const captchaOk = await verifyTurnstile(captchaToken, ip);
  if (!captchaOk) {
    // Log the failed attempt
    await supabase.from("signup_rate_limits").insert({
      ip_address: ip, email, success: false, user_agent: userAgent,
    });
    return json({ error: "Verification failed. Please refresh and try again." }, 403);
  }

  // 3. Create the user via admin API (auto-handles email confirmation per project settings)
  const origin = req.headers.get("origin") ?? "";
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: origin ? `${origin}/onboarding` : undefined,
      data: { full_name: fullName },
    },
  });

  // 4. Log the attempt regardless of outcome
  await supabase.from("signup_rate_limits").insert({
    ip_address: ip,
    email,
    success: !signUpErr,
    user_agent: userAgent,
  });

  if (signUpErr) {
    console.warn("[signup] auth.signUp failed:", signUpErr.message);
    return json({ error: signUpErr.message }, 400);
  }

  return json({
    success: true,
    user_id: signUpData.user?.id,
    has_session: !!signUpData.session,
    // Pass session tokens so the client can hydrate without a second call.
    session: signUpData.session
      ? {
          access_token: signUpData.session.access_token,
          refresh_token: signUpData.session.refresh_token,
        }
      : null,
  });
});