import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  mobile: z.string().trim().min(7).max(20),
});

function normalizeMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  // Indian mobile: 10 digits or 12 digits with 91 prefix
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits[2]))
    return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { name, email } = parsed.data;
    const mobile = normalizeMobile(parsed.data.mobile);
    if (!mobile) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid mobile number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

    // Rate limit: max 5 OTPs per email per hour, max 10 per IP per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count: emailCount } = await supabase
      .from("playbook_otp_verifications")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", oneHourAgo);

    if ((emailCount ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please try again in an hour." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (ip) {
      const { count: ipCount } = await supabase
        .from("playbook_otp_verifications")
        .select("*", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", oneHourAgo);
      if ((ipCount ?? 0) >= 10) {
        return new Response(
          JSON.stringify({ error: "Too many requests from this network." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await sha256(otp);

    const { data: row, error: insertErr } = await supabase
      .from("playbook_otp_verifications")
      .insert({
        name,
        email,
        mobile,
        otp_hash: otpHash,
        ip,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (insertErr || !row) {
      console.error("[playbook-send-otp] insert failed", insertErr);
      return new Response(
        JSON.stringify({ error: "Could not create verification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Send the OTP via the transactional email function. If it doesn't exist yet
    // (email infra not set up), we log the OTP so admins can verify the flow
    // works end-to-end before email is configured.
    let emailSent = false;
    try {
      const { error: sendErr } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "playbook-otp",
            recipientEmail: email,
            idempotencyKey: `playbook-otp-${row.id}`,
            templateData: { name, otp },
          },
        },
      );
      if (sendErr) {
        console.warn("[playbook-send-otp] send-transactional-email error", sendErr);
      } else {
        emailSent = true;
      }
    } catch (e) {
      console.warn("[playbook-send-otp] transactional invoke failed", e);
    }

    if (!emailSent) {
      console.log(
        `[playbook-send-otp] DEV MODE — OTP for ${email}: ${otp} (verification id ${row.id})`,
      );
    }

    return new Response(
      JSON.stringify({ verification_id: row.id, email_sent: emailSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[playbook-send-otp] error", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});