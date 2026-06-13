// Sends a Purchase Order to the linked vendor via email.
// Auth: admin or manager only. Logs every attempt to vendor_po_dispatch_log.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function buildHtml(opts: {
  companyName: string; accent: string; logoUrl: string | null;
  poNumber: string; projectName: string; vendorName: string; vendorContact: string | null;
  items: { name: string; qty: number; unit: string; rate: number; total: number }[];
  subtotal: number; gst: number; total: number; paymentTerms: string | null;
}): string {
  const rows = opts.items.map(it => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${it.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${it.qty} ${it.unit}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${inr(it.rate)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${inr(it.total)}</td>
    </tr>`).join("");
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f7f7f9;margin:0;padding:24px;color:#1a1a1a">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee">
      <div style="background:${opts.accent};color:#fff;padding:16px 20px">
        ${opts.logoUrl ? `<img src="${opts.logoUrl}" alt="${opts.companyName}" style="max-height:40px;display:block;margin-bottom:8px"/>` : ""}
        <h2 style="margin:0;font-size:18px">${opts.companyName}</h2>
        <p style="margin:4px 0 0;font-size:13px;opacity:.9">Purchase Order ${opts.poNumber}</p>
      </div>
      <div style="padding:20px">
        <p style="margin:0 0 4px"><strong>To:</strong> ${opts.vendorName}${opts.vendorContact ? ` (${opts.vendorContact})` : ""}</p>
        <p style="margin:0 0 16px"><strong>Project:</strong> ${opts.projectName}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f5f5f7">
            <th style="padding:8px;text-align:left">Item</th>
            <th style="padding:8px;text-align:right">Qty</th>
            <th style="padding:8px;text-align:right">Rate</th>
            <th style="padding:8px;text-align:right">Total</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td colspan="3" style="padding:8px;text-align:right">Subtotal</td><td style="padding:8px;text-align:right">${inr(opts.subtotal)}</td></tr>
            <tr><td colspan="3" style="padding:8px;text-align:right">GST</td><td style="padding:8px;text-align:right">${inr(opts.gst)}</td></tr>
            <tr><td colspan="3" style="padding:8px;text-align:right;font-weight:700">Total</td><td style="padding:8px;text-align:right;font-weight:700">${inr(opts.total)}</td></tr>
          </tfoot>
        </table>
        ${opts.paymentTerms ? `<p style="margin-top:16px;font-size:13px"><strong>Payment terms:</strong> ${opts.paymentTerms}</p>` : ""}
        <p style="margin-top:16px;font-size:13px">Please reply to confirm acceptance and the expected delivery date.</p>
      </div>
    </div></body></html>`;
}

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
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = (roles ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "manager");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Admin or manager only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const poId: string | undefined = body?.purchase_order_id;
    if (!poId) {
      return new Response(JSON.stringify({ error: "Missing purchase_order_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: po } = await admin.from("purchase_orders").select("*").eq("id", poId).maybeSingle();
    if (!po) {
      return new Response(JSON.stringify({ error: "PO not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: vendor } = await admin.from("vendors").select("*").eq("id", po.vendor_id).maybeSingle();
    if (!vendor?.email) {
      return new Response(JSON.stringify({ error: "Vendor has no email address." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: project } = po.project_id
      ? await admin.from("projects").select("name").eq("id", po.project_id).maybeSingle()
      : { data: null };
    const { data: items } = await admin.from("project_boq_items").select("*").eq("po_id", poId);
    const { data: comp } = await admin.from("company_settings").select("*").limit(1).maybeSingle();

    const html = buildHtml({
      companyName: comp?.company_name ?? "Our Company",
      accent: comp?.accent_color ?? "#0F2C5F",
      logoUrl: comp?.logo_url || null,
      poNumber: po.po_number,
      projectName: project?.name ?? "Project",
      vendorName: vendor.name,
      vendorContact: vendor.contact_person ?? null,
      items: (items ?? []).map((i: any) => ({
        name: i.item_name, qty: Number(i.quantity), unit: i.unit,
        rate: Number(i.rate), total: Number(i.total),
      })),
      subtotal: Number(po.amount), gst: Number(po.gst_amount), total: Number(po.total_amount),
      paymentTerms: vendor.payment_terms ?? null,
    });
    const subject = `Purchase Order ${po.po_number} — ${comp?.company_name ?? ""}`.trim();

    // Try Lovable Emails queue (created when an email domain is configured).
    let dispatchStatus = "queued";
    let dispatchError: string | null = null;
    try {
      const { error: enqErr } = await admin.rpc("enqueue_email" as any, {
        p_to: vendor.email,
        p_subject: subject,
        p_html: html,
        p_purpose: "transactional",
        p_template_name: "vendor_po",
        p_idempotency_key: `vendor_po:${poId}:${Date.now()}`,
      } as any);
      if (enqErr) { dispatchStatus = "failed"; dispatchError = enqErr.message; }
    } catch (e) {
      dispatchStatus = "failed";
      dispatchError = e instanceof Error ? e.message : String(e);
    }

    await admin.from("vendor_po_dispatch_log").insert({
      purchase_order_id: poId, channel: "email", recipient: vendor.email,
      status: dispatchStatus, error: dispatchError,
    });

    if (dispatchStatus === "failed") {
      return new Response(JSON.stringify({
        error: `Email could not be queued: ${dispatchError}. Configure an email domain in Cloud → Emails first.`,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (po.status === "draft") {
      await admin.from("purchase_orders").update({ status: "sent" }).eq("id", poId);
    }

    return new Response(JSON.stringify({ ok: true, message: `PO emailed to ${vendor.email}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-vendor-po error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
