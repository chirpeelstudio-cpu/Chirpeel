// One-shot admin tool: creates Razorpay plans for each row in `razorpay_plans`
// that does not yet have a `razorpay_plan_id`, then stores the returned id.
// Safe to re-run: existing ids are preserved.
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
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userRes.user.id);
    if (!(roles ?? []).some((r: { role: string }) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Razorpay keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const auth = safeBtoa(`${keyId}:${keySecret}`);

    const { data: plans, error } = await admin
      .from("razorpay_plans")
      .select("*")
      .is("razorpay_plan_id", null);
    if (error) throw error;

    const results: any[] = [];
    for (const row of plans ?? []) {
      const period = row.billing_cycle === "yearly" ? "yearly" : "monthly";
      const itemName = `${row.plan === "pro" ? "Pro" : "Studio"} · ${row.billing_cycle}${
        row.variant === "promo50" ? " (50% off)" : ""
      }`;
      const body = {
        period,
        interval: 1,
        item: {
          name: itemName,
          amount: row.amount_inr * 100,
          currency: "INR",
          description: `StudioCRM ${row.plan} plan`,
        },
        notes: { plan: row.plan, billing_cycle: row.billing_cycle, variant: row.variant },
      };
      const res = await fetch("https://api.razorpay.com/v1/plans", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        results.push({ plan: row.plan, billing_cycle: row.billing_cycle, variant: row.variant, error: json });
        continue;
      }
      await admin.from("razorpay_plans").update({ razorpay_plan_id: json.id }).eq("id", row.id);
      results.push({ plan: row.plan, billing_cycle: row.billing_cycle, variant: row.variant, razorpay_plan_id: json.id });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seed-razorpay-plans error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});