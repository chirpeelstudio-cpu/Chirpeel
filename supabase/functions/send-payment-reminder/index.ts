import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  reminder_count: number;
}

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

function emailHtml(inv: Invoice) {
  const out = Number(inv.total_amount) - Number(inv.paid_amount);
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#0F2C5F;color:white;padding:20px;border-radius:8px 8px 0 0">
      <h2 style="margin:0">Chirpeel Interiors</h2>
      <p style="margin:4px 0 0;opacity:.85;font-size:13px">Premium Interiors · 10-Year Warranty</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px">
      <p>Dear ${inv.customer_name},</p>
      <p>This is a friendly reminder that your invoice <strong>${inv.invoice_number}</strong> is due for payment.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#f9fafb">Outstanding</td><td style="padding:8px;background:#f9fafb;text-align:right;font-weight:bold;font-size:18px">${fmtINR(out)}</td></tr>
        <tr><td style="padding:8px">Due date</td><td style="padding:8px;text-align:right">${new Date(inv.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</td></tr>
      </table>
      <p>We would appreciate it if you could arrange the payment at your earliest convenience. If you've already paid, please ignore this reminder.</p>
      <p>For any queries, reply to this email or call us on +91 90030 47474.</p>
      <p style="margin-top:24px">Warm regards,<br/><strong>Chirpeel Interiors</strong></p>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px">This is an automated reminder · chirpeel.com</p>
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const manualId = body?.invoice_id as string | undefined;
    const isCron = !manualId;

    // Auto-mark overdue
    await supabase.rpc("mark_overdue_invoices");

    let query = supabase.from("invoices").select("id, invoice_number, customer_name, customer_email, total_amount, paid_amount, due_date, reminder_count, last_reminder_at");
    if (manualId) {
      query = query.eq("id", manualId);
    } else {
      // Cron: only overdue, not reminded in last 3 days, with email
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      query = query.eq("status", "overdue").or(`last_reminder_at.is.null,last_reminder_at.lt.${threeDaysAgo}`);
    }

    const { data: invoices, error } = await query;
    if (error) throw error;
    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: "No invoices to remind" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0, skipped = 0, failed = 0;
    for (const inv of invoices as Invoice[]) {
      if (!inv.customer_email) {
        await supabase.from("finance_reminder_log").insert({
          invoice_id: inv.id, channel: "email", status: "failed", error: "no_email",
        });
        skipped++; continue;
      }

      let success = false, errMsg: string | null = null;

      if (RESEND_API_KEY) {
        try {
          const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
              "X-Connection-Api-Key": RESEND_API_KEY,
            },
            body: JSON.stringify({
              from: "Chirpeel Interiors <onboarding@resend.dev>",
              to: [inv.customer_email],
              subject: `Payment Reminder: Invoice ${inv.invoice_number}`,
              html: emailHtml(inv),
            }),
          });
          const j = await r.json();
          success = r.ok;
          if (!r.ok) errMsg = JSON.stringify(j);
        } catch (e) {
          errMsg = (e as Error).message;
        }
      } else {
        // No email provider configured — log as queued for when email is set up
        errMsg = "no_email_provider_configured";
      }

      await supabase.from("finance_reminder_log").insert({
        invoice_id: inv.id,
        channel: "email",
        sent_to: inv.customer_email,
        status: success ? "sent" : (RESEND_API_KEY ? "failed" : "queued"),
        error: errMsg,
      });

      if (success) {
        await supabase.from("invoices").update({
          last_reminder_at: new Date().toISOString(),
          reminder_count: (inv.reminder_count || 0) + 1,
        }).eq("id", inv.id);
        sent++;
      } else {
        failed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, skipped, failed, total: invoices.length, isCron }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
