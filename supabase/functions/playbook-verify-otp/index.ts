import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  verification_id: z.string().uuid(),
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function genToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
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
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: fetchErr } = await supabase
      .from("playbook_otp_verifications")
      .select("*")
      .eq("id", parsed.data.verification_id)
      .single();

    if (fetchErr || !row) {
      return new Response(
        JSON.stringify({ error: "Invalid verification" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (row.verified_at) {
      return new Response(
        JSON.stringify({ error: "Already verified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ error: "OTP expired. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if ((row.attempts ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Request a new OTP." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const submittedHash = await sha256(parsed.data.otp);
    if (submittedHash !== row.otp_hash) {
      await supabase
        .from("playbook_otp_verifications")
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id);
      return new Response(
        JSON.stringify({ error: "Incorrect OTP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark verified
    const verifiedAt = new Date().toISOString();
    await supabase
      .from("playbook_otp_verifications")
      .update({ verified_at: verifiedAt })
      .eq("id", row.id);

    // Upsert into playbook_subscribers
    await supabase.from("playbook_subscribers").upsert(
      {
        email: row.email,
        name: row.name,
        mobile: row.mobile,
        verified: true,
        verified_at: verifiedAt,
        source: "landing-playbooks",
        user_agent: row.user_agent,
      },
      { onConflict: "email" },
    );

    // Create a CRM lead so the studio sees it in the pipeline
    try {
      await supabase.from("leads").insert({
        name: row.name ?? row.email,
        phone: row.mobile ?? "—",
        email: row.email,
        source: "landing-playbooks",
        stage: "leads",
        status: "new_lead",
        details: "Downloaded Chirpeel playbooks",
      });
    } catch (e) {
      console.warn("[playbook-verify-otp] lead insert failed", e);
    }

    const downloadToken = genToken();
    return new Response(
      JSON.stringify({ ok: true, download_token: downloadToken, email: row.email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[playbook-verify-otp] error", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});