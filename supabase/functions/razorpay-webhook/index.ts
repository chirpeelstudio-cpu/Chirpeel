// Razorpay webhook receiver. Verifies signature using RAZORPAY_WEBHOOK_SECRET,
// records `payment_link.paid` events into the `payments` table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not configured");
    return new Response("Not configured", { status: 500, headers: corsHeaders });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400, headers: corsHeaders });
  }
  const expected = await hmacSha256Hex(secret, raw);
  if (expected !== signature) {
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const event: string = payload.event ?? "";

  if (event === "payment_link.paid") {
    const link = payload?.payload?.payment_link?.entity;
    const payment = payload?.payload?.payment?.entity;
    if (link && payment) {
      const quotation_id: string | undefined = link?.notes?.quotation_id;
      const lead_id: string | undefined = link?.notes?.lead_id || undefined;
      const amountRupees = Number(payment.amount ?? 0) / 100;
      try {
        await supabase.from("payments").insert({
          quotation_id: quotation_id ?? null,
          lead_id: lead_id ?? null,
          amount: amountRupees,
          mode: "razorpay",
          reference: payment.id,
          milestone: "Booking advance",
          paid_on: new Date().toISOString().slice(0, 10),
          notes: `Razorpay payment_link ${link.id}`,
          recorded_by: "razorpay-webhook",
        });
      } catch (e) {
        console.error("payments insert failed", e);
      }
    }
  }

  // Subscription lifecycle events — keep `subscriptions` table in sync.
  if (event.startsWith("subscription.")) {
    const sub = payload?.payload?.subscription?.entity;
    if (sub?.id) {
      const update: Record<string, unknown> = {
        status: sub.status ?? null,
        raw: sub,
      };
      if (sub.current_start) update.current_start = new Date(sub.current_start * 1000).toISOString();
      if (sub.current_end) update.current_end = new Date(sub.current_end * 1000).toISOString();
      try {
        await supabase.from("subscriptions").update(update)
          .eq("razorpay_subscription_id", sub.id);
      } catch (e) {
        console.error("subscription update failed", e);
      }

      // Log lifecycle changes into activity_log for the tenant (best-effort).
      try {
        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("id, tenant_id, plan, billing_cycle")
          .eq("razorpay_subscription_id", sub.id)
          .maybeSingle();
        const tenant_id = (subRow as { tenant_id?: string } | null)?.tenant_id;
        if (tenant_id) {
          const summary =
            event === "subscription.activated" ? `Subscription activated (${(subRow as { plan?: string })?.plan ?? "plan"})` :
            event === "subscription.charged"   ? `Subscription charged` :
            event === "subscription.cancelled" ? `Subscription cancelled` :
            event === "subscription.completed" ? `Subscription completed` :
            event === "subscription.halted"    ? `Subscription halted` :
            `Subscription ${event.replace("subscription.", "")}`;
          await supabase.from("activity_log").insert({
            tenant_id,
            actor: "razorpay-webhook",
            action: "update",
            entity_type: "subscription",
            entity_id: (subRow as { id?: string } | null)?.id ?? null,
            summary,
            diff: { event, status: sub.status, raw: sub },
          });
        }

        // On subscription.charged → record an invoice row for charge history.
        if (event === "subscription.charged" && tenant_id) {
          const payment = payload?.payload?.payment?.entity;
          const invoice = payload?.payload?.invoice?.entity;
          const amount = Number(payment?.amount ?? invoice?.amount ?? 0) / 100;
          const charged_at_unix = (payment?.created_at ?? invoice?.issued_at ?? Math.floor(Date.now() / 1000)) as number;
          const invoiceRow = {
            tenant_id,
            subscription_id: (subRow as { id?: string } | null)?.id ?? null,
            razorpay_subscription_id: sub.id,
            razorpay_invoice_id: invoice?.id ?? null,
            razorpay_payment_id: payment?.id ?? null,
            amount_inr: amount,
            status: invoice?.status ?? "paid",
            charged_at: new Date(charged_at_unix * 1000).toISOString(),
            short_url: invoice?.short_url ?? null,
            raw: { invoice, payment },
          };
          // upsert by razorpay_invoice_id when present, otherwise just insert.
          if (invoice?.id) {
            await supabase.from("subscription_invoices")
              .upsert(invoiceRow, { onConflict: "razorpay_invoice_id" });
          } else {
            await supabase.from("subscription_invoices").insert(invoiceRow);
          }
        }
      } catch (e) {
        console.error("subscription side-effects failed", e);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
