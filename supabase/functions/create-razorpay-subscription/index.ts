// Creates a Razorpay subscription for the signed-in user's tenant.
// Body: { plan: 'pro'|'studio', billing_cycle: 'monthly'|'yearly', promo_locked?: boolean }
// Returns: { subscription_id, short_url, key_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const safeBtoa = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;
    const billing_cycle = body?.billing_cycle;
    const promo_locked = !!body?.promo_locked;

    if (!["pro", "studio"].includes(plan) || !["monthly", "yearly"].includes(billing_cycle)) {
      return new Response(JSON.stringify({ error: "Invalid plan or billing_cycle" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve tenant
    const { data: membership } = await admin
      .from("tenant_members").select("tenant_id").eq("user_id", user.id).maybeSingle();
    const tenant_id = (membership as any)?.tenant_id;
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "No tenant for user. Complete onboarding first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve Razorpay plan id
    const variant = billing_cycle === "monthly" && promo_locked ? "promo50" : "standard";
    const { data: planRow } = await admin
      .from("razorpay_plans")
      .select("razorpay_plan_id, amount_inr")
      .eq("plan", plan).eq("billing_cycle", billing_cycle).eq("variant", variant)
      .maybeSingle();
    if (!planRow?.razorpay_plan_id) {
      return new Response(JSON.stringify({
        error: "Razorpay plan not provisioned yet. Run seed-razorpay-plans (admin).",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Razorpay keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const auth = safeBtoa(`${keyId}:${keySecret}`);

    // total_count: how many billing cycles before auto-stop
    // monthly subs run for 12 months; yearly for 5 years (Razorpay max is 12 months for monthly per spec, but we use 60 for monthly = 5 years; here keep simple)
    const total_count = billing_cycle === "monthly" ? 60 : 5;

    const subBody = {
      plan_id: planRow.razorpay_plan_id,
      total_count,
      customer_notify: 1,
      notes: {
        tenant_id,
        user_id: user.id,
        plan,
        billing_cycle,
        promo_locked: promo_locked ? "true" : "false",
      },
    };

    const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify(subBody),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("Razorpay create sub error", res.status, json);
      return new Response(JSON.stringify({
        error: json?.error?.description ?? `Razorpay HTTP ${res.status}`,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("subscriptions").insert({
      tenant_id, user_id: user.id, plan, billing_cycle,
      razorpay_subscription_id: json.id,
      razorpay_plan_id: planRow.razorpay_plan_id,
      status: json.status ?? "created",
      promo_locked,
      short_url: json.short_url ?? null,
      raw: json,
    });

    return new Response(JSON.stringify({
      ok: true,
      subscription_id: json.id,
      short_url: json.short_url,
      key_id: keyId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("create-razorpay-subscription error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});