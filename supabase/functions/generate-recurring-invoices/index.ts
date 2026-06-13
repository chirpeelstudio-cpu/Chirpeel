// Edge function: generate-recurring-invoices
// Scans active recurring_invoice_templates whose next_run_date <= today,
// inserts new invoices, advances next_run_date, updates last_generated_at.
// Designed for a daily pg_cron call but also callable manually from the UI.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Template {
  id: string;
  quotation_id: string | null;
  lead_id: string | null;
  milestone: string | null;
  milestone_label: string | null;
  amount: number;
  gst_enabled: boolean;
  gst_rate: number;
  frequency: "weekly" | "monthly" | "quarterly";
  next_run_date: string;
}

function advanceDate(iso: string, frequency: Template["frequency"]): string {
  const d = new Date(iso + "T00:00:00Z");
  if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (frequency === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else if (frequency === "quarterly") d.setUTCMonth(d.getUTCMonth() + 3);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const today = new Date().toISOString().slice(0, 10);

    const { data: templates, error: tErr } = await supabase
      .from("recurring_invoice_templates")
      .select("id, quotation_id, lead_id, milestone, milestone_label, amount, gst_enabled, gst_rate, frequency, next_run_date")
      .eq("active", true)
      .lte("next_run_date", today);

    if (tErr) throw tErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ ok: true, generated: 0, message: "No templates due" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;
    const errors: string[] = [];

    for (const t of templates as Template[]) {
      try {
        // Fetch quotation customer info
        if (!t.quotation_id) { errors.push(`${t.id}: missing quotation`); continue; }
        const { data: quo } = await supabase
          .from("quotations")
          .select("customer_name, customer_email, customer_phone, customer_address, lead_id")
          .eq("id", t.quotation_id)
          .maybeSingle();

        if (!quo) { errors.push(`${t.id}: quotation not found`); continue; }

        const gstAmount = t.gst_enabled ? (Number(t.amount) * Number(t.gst_rate)) / 100 : 0;
        const total = Number(t.amount) + gstAmount;

        // Compute due date = today + 7 days
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const { error: invErr } = await supabase.from("invoices").insert({
          invoice_number: "", // assign_invoice_number trigger fills
          quotation_id: t.quotation_id,
          lead_id: quo.lead_id ?? t.lead_id,
          customer_name: quo.customer_name,
          customer_email: quo.customer_email,
          customer_phone: quo.customer_phone,
          customer_address: quo.customer_address,
          milestone: t.milestone,
          milestone_label: t.milestone_label,
          amount: t.amount,
          gst_enabled: t.gst_enabled,
          gst_rate: t.gst_rate,
          gst_amount: gstAmount,
          total_amount: total,
          issue_date: today,
          due_date: dueDate.toISOString().slice(0, 10),
          status: "issued",
          notes: `Auto-generated from recurring template (${t.frequency})`,
          created_by: "system:recurring",
        });
        if (invErr) { errors.push(`${t.id}: ${invErr.message}`); continue; }

        // Advance next_run_date
        const nextRun = advanceDate(t.next_run_date, t.frequency);
        await supabase.from("recurring_invoice_templates").update({
          next_run_date: nextRun,
          last_generated_at: new Date().toISOString(),
        }).eq("id", t.id);

        generated++;
      } catch (e) {
        errors.push(`${t.id}: ${(e as Error).message}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, generated, total: templates.length, errors }), {
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
