// Daily digest email — invoked by pg_cron at 9 AM IST
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get opted-in admin/manager profiles
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "manager"]);
    const userIds = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    const { data: profiles } = await supabase.from("profiles").select("id, email, full_name, digest_opt_in")
      .in("id", userIds).eq("active", true);

    // Compute stats
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const [{ count: newLeads }, { data: overdue }, { data: paymentsYday }, { data: outstandingInv }] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", dayAgo),
      supabase.from("lead_follow_ups").select("id").eq("completed", false).lt("follow_up_date", new Date().toISOString()),
      supabase.from("payments").select("amount").is("deleted_at", null).eq("paid_on", yesterday),
      supabase.from("invoices").select("total_amount, paid_amount").is("deleted_at", null).neq("status", "paid"),
    ]);

    const collectedYday = (paymentsYday ?? []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const outstanding = (outstandingInv ?? []).reduce((s: number, i: any) => s + Math.max(0, Number(i.total_amount) - Number(i.paid_amount)), 0);

    const stats = {
      newLeads: newLeads || 0,
      overdueFollowUps: (overdue ?? []).length,
      collectedYesterday: collectedYday,
      outstanding,
    };

    const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#fff;color:#0F2C5F">
        <h2 style="margin:0 0 16px">☀️ Your Daily Digest</h2>
        <p style="color:#666;font-size:14px">${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:12px;border:1px solid #eee;background:#f9fafb">🔔 New leads (24h)</td><td style="padding:12px;border:1px solid #eee;text-align:right;font-weight:bold">${stats.newLeads}</td></tr>
          <tr><td style="padding:12px;border:1px solid #eee;background:#f9fafb">⏰ Overdue follow-ups</td><td style="padding:12px;border:1px solid #eee;text-align:right;font-weight:bold;color:${stats.overdueFollowUps > 0 ? "#dc2626" : "#0F2C5F"}">${stats.overdueFollowUps}</td></tr>
          <tr><td style="padding:12px;border:1px solid #eee;background:#f9fafb">💰 Collected yesterday</td><td style="padding:12px;border:1px solid #eee;text-align:right;font-weight:bold;color:#10b981">${inr(stats.collectedYesterday)}</td></tr>
          <tr><td style="padding:12px;border:1px solid #eee;background:#f9fafb">📋 Total outstanding</td><td style="padding:12px;border:1px solid #eee;text-align:right;font-weight:bold">${inr(stats.outstanding)}</td></tr>
        </table>
        <p style="margin-top:24px"><a href="https://chirpeel.com/admin/dashboard" style="display:inline-block;padding:10px 20px;background:#0F2C5F;color:#fff;text-decoration:none;border-radius:6px">Open dashboard →</a></p>
        <p style="color:#999;font-size:12px;margin-top:24px">You can disable this digest in Team → My Hours.</p>
      </div>
    `;

    let sent = 0; const errors: string[] = [];
    for (const p of (profiles ?? [])) {
      if (!p.digest_opt_in || !p.email) continue;
      try {
        const r = await supabase.functions.invoke("send-transactional-email", {
          body: {
            to: p.email,
            subject: `☀️ Daily digest — ${stats.newLeads} new leads, ${inr(stats.collectedYesterday)} collected`,
            html,
            purpose: "transactional",
            idempotency_key: `digest-${new Date().toISOString().slice(0, 10)}-${p.id}`,
          },
        });
        if (r.error) throw r.error;
        await supabase.from("digest_log").insert({ sent_to: p.email, status: "sent", payload: stats });
        sent++;
      } catch (e: any) {
        await supabase.from("digest_log").insert({ sent_to: p.email, status: "failed", error: String(e?.message || e), payload: stats });
        errors.push(`${p.email}: ${e?.message || e}`);
      }
    }

    return new Response(JSON.stringify({ sent, errors, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
