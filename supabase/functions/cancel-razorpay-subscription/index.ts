// Cancels the current tenant's Razorpay subscription (admin only).
// Body: { subscription_id?: string, cancel_at_cycle_end?: boolean }
// If subscription_id omitted, cancels the latest subscription for the user's tenant.
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
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r: { role: string }) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    let subscription_id: string | undefined = body?.subscription_id;
    const cancel_at_cycle_end = !!body?.cancel_at_cycle_end;

    const { data: membership } = await admin
      .from("tenant_members").select("tenant_id").eq("user_id", user.id).maybeSingle();
    const tenant_id = (membership as any)?.tenant_id;
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "No tenant" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscription_id) {
      const { data: latest } = await admin
        .from("subscriptions").select("razorpay_subscription_id")
        .eq("tenant_id", tenant_id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      subscription_id = (latest as any)?.razorpay_subscription_id;
    }
    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const auth = safeBtoa(`${keyId}:${keySecret}`);

    const res = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subscription_id}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cancel_at_cycle_end: cancel_at_cycle_end ? 1 : 0 }),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({
        error: json?.error?.description ?? `Razorpay HTTP ${res.status}`,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("subscriptions")
      .update({ status: json.status ?? "cancelled", raw: json })
      .eq("razorpay_subscription_id", subscription_id);

    return new Response(JSON.stringify({ ok: true, status: json.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cancel-razorpay-subscription error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});