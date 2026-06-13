// Manually generate or regenerate a Razorpay booking-advance payment link
// for a quotation. Used by admins from the Quotation Builder Payment tab.
// Supports overrides: custom amount, description, expiry, customer contact.
//
// Auth: requires a logged-in admin/manager.
//
// Body: {
//   quotation_id: string,
//   regenerate?: boolean,
//   amount_rupees?: number,        // overrides 10% default
//   description?: string,
//   expire_at?: string,            // ISO datetime
//   customer_name?: string,
//   customer_email?: string | null,
//   customer_phone?: string | null
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RazorpayLink { id: string; short_url: string; }

// btoa fails on non-Latin1 chars. Encode UTF-8 first, then base64.
const safeBtoa = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

async function createRazorpayLink(opts: {
  amountPaise: number;
  description: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  referenceId: string;
  notes: Record<string, string>;
  expireBy?: number; // unix seconds
}): Promise<RazorpayLink | { error: string }> {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return { error: "Razorpay keys not configured" };
  const auth = safeBtoa(`${keyId}:${keySecret}`);
  // Strip non-Latin1 chars from description (Razorpay header/encoding safety)
  const safeDescription = opts.description
    .replace(/[—–]/g, "-")
    .replace(/[^\x00-\xFF]/g, "")
    .slice(0, 2048);
  const body: Record<string, unknown> = {
    amount: opts.amountPaise,
    currency: "INR",
    accept_partial: false,
    description: safeDescription,
    reference_id: opts.referenceId,
    customer: {
      name: opts.customerName,
      ...(opts.customerEmail ? { email: opts.customerEmail } : {}),
      ...(opts.customerPhone ? { contact: opts.customerPhone } : {}),
    },
    notify: { sms: !!opts.customerPhone, email: !!opts.customerEmail },
    reminder_enable: true,
    notes: opts.notes,
  };
  if (opts.expireBy) body.expire_by = opts.expireBy;

  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Razorpay error", res.status, json);
    return { error: json?.error?.description ?? `Razorpay HTTP ${res.status}` };
  }
  return { id: json.id, short_url: json.short_url };
}

async function cancelRazorpayLink(linkId: string): Promise<void> {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return;
  try {
    const auth = safeBtoa(`${keyId}:${keySecret}`);
    await fetch(`https://api.razorpay.com/v1/payment_links/${linkId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}` },
    });
  } catch (e) {
    console.warn("Failed to cancel old Razorpay link", linkId, e);
  }
}

const normalizePhone = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Razorpay requires E.164-ish format. Reject obviously invalid lengths.
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+91${digits.slice(1)}`;
  return `+${digits}`;
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
    const userId = userRes.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const isMgr = (roles ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "manager");
    if (!isMgr) {
      return new Response(JSON.stringify({ error: "Admin or manager only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const quotationId: string | undefined = body?.quotation_id;
    const regenerate: boolean = !!body?.regenerate;
    const amountOverride = typeof body?.amount_rupees === "number" ? body.amount_rupees : null;
    const descriptionOverride = typeof body?.description === "string" ? body.description.trim() : null;
    const expireAtRaw = typeof body?.expire_at === "string" ? body.expire_at : null;
    const customerNameOv = typeof body?.customer_name === "string" ? body.customer_name.trim() : null;
    const customerEmailOv = typeof body?.customer_email === "string" ? body.customer_email.trim() : null;
    const customerPhoneOv = typeof body?.customer_phone === "string" ? body.customer_phone.trim() : null;

    if (!quotationId || typeof quotationId !== "string") {
      return new Response(JSON.stringify({ error: "Missing quotation_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: quotation, error: qErr } = await admin
      .from("quotations").select("*").eq("id", quotationId).is("deleted_at", null).maybeSingle();
    if (qErr || !quotation) {
      return new Response(JSON.stringify({ error: "Quotation not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (quotation.payment_status === "paid") {
      return new Response(JSON.stringify({ error: "Payment already received for this quotation" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasOverrides = amountOverride !== null || descriptionOverride !== null || expireAtRaw !== null
      || customerNameOv !== null || customerEmailOv !== null || customerPhoneOv !== null;

    // Reuse existing only when no overrides AND not regenerating
    if (quotation.payment_link_url && !regenerate && !hasOverrides) {
      return new Response(JSON.stringify({
        ok: true, existing: true,
        payment_url: quotation.payment_link_url,
        payment_link_id: quotation.payment_link_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cancel old link when regenerating OR applying edits
    if ((regenerate || hasOverrides) && quotation.payment_link_id) {
      await cancelRazorpayLink(quotation.payment_link_id);
    }

    const totalRupees = Number(quotation.total_amount ?? 0);
    const defaultAdvance = Math.max(1, Math.round(totalRupees * 0.1));
    const finalAmount = amountOverride !== null
      ? Math.max(1, Math.round(amountOverride))
      : defaultAdvance;

    if (finalAmount <= 0) {
      return new Response(JSON.stringify({ error: "Amount must be greater than zero" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let expireBy: number | undefined;
    if (expireAtRaw) {
      const t = Date.parse(expireAtRaw);
      if (Number.isNaN(t)) {
        return new Response(JSON.stringify({ error: "Invalid expire_at" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const secs = Math.floor(t / 1000);
      // Razorpay requires expire_by to be at least 15 minutes in the future
      if (secs * 1000 < Date.now() + 15 * 60 * 1000) {
        return new Response(JSON.stringify({ error: "Expiry must be at least 15 minutes from now" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      expireBy = secs;
    }

    const customerName = customerNameOv || quotation.customer_name;
    const customerEmail = customerEmailOv ?? quotation.customer_email ?? null;
    const customerPhone = normalizePhone(customerPhoneOv ?? quotation.customer_phone);

    const description = (descriptionOverride && descriptionOverride.length > 0)
      ? descriptionOverride
      : `Booking advance for ${quotation.quotation_number} — ${quotation.project_name ?? "Interior project"}`;

    const result = await createRazorpayLink({
      amountPaise: finalAmount * 100,
      description,
      customerName,
      customerEmail,
      customerPhone,
      referenceId: `${quotation.quotation_number}-${Date.now()}`,
      expireBy,
      notes: {
        quotation_id: quotation.id,
        quotation_number: quotation.quotation_number,
        lead_id: quotation.lead_id ?? "",
        purpose: amountOverride !== null ? "custom_amount" : "booking_advance",
        triggered_by: "admin_manual",
      },
    });

    if ("error" in result) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("quotations").update({
      payment_link_url: result.short_url,
      payment_link_id: result.id,
      payment_link_created_at: new Date().toISOString(),
      payment_status: "active",
    }).eq("id", quotation.id);

    return new Response(JSON.stringify({
      ok: true,
      payment_url: result.short_url,
      payment_link_id: result.id,
      amount: finalAmount,
      regenerated: regenerate || hasOverrides,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("create-payment-link error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
