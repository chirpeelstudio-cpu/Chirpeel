// Approve quotation from public client portal:
// 1. Validates share token
// 2. Marks quotation approved + workflow_status approved
// 3. Creates Razorpay payment link for booking advance (10% of total)
// 4. Creates a project + seeds milestones & tasks
// Idempotent: if already approved, returns existing payment_url + project_id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SEED_TASKS: { title: string; sort_order: number }[] = [
  { title: "Site measurement & finalization", sort_order: 1 },
  { title: "Design freeze with customer", sort_order: 2 },
  { title: "Material order placed", sort_order: 3 },
  { title: "Factory production", sort_order: 4 },
  { title: "Site installation", sort_order: 5 },
  { title: "Final handover & client sign-off", sort_order: 6 },
];

const SEED_MILESTONES: { title: string; sort_order: number; offsetDays: number }[] = [
  { title: "Planning complete", sort_order: 1, offsetDays: 7 },
  { title: "Design freeze", sort_order: 2, offsetDays: 14 },
  { title: "Procurement done", sort_order: 3, offsetDays: 25 },
  { title: "Production complete", sort_order: 4, offsetDays: 40 },
  { title: "Site work complete", sort_order: 5, offsetDays: 55 },
  { title: "Handover", sort_order: 6, offsetDays: 60 },
];

async function createRazorpayLink(opts: {
  amountPaise: number;
  description: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  referenceId: string;
  notes: Record<string, string>;
}): Promise<{ id: string; short_url: string } | null> {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    console.warn("Razorpay keys missing — skipping payment link creation");
    return null;
  }
  const auth = btoa(`${keyId}:${keySecret}`);
  const body = {
    amount: opts.amountPaise,
    currency: "INR",
    accept_partial: false,
    description: opts.description.slice(0, 2048),
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
  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Razorpay error", res.status, json);
    return null;
  }
  return { id: json.id, short_url: json.short_url };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Resolve share link → lead
    const { data: link, error: linkErr } = await supabase
      .from("client_share_links")
      .select("id, lead_id, revoked, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (linkErr || !link || link.revoked) {
      return new Response(JSON.stringify({ error: "Invalid or revoked link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Link expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Latest quotation for that lead
    const { data: quotation, error: qErr } = await supabase
      .from("quotations")
      .select("*")
      .eq("lead_id", link.lead_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (qErr || !quotation) {
      return new Response(JSON.stringify({ error: "No quotation found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Idempotency
    if (quotation.client_approved_at && quotation.auto_project_id) {
      return new Response(
        JSON.stringify({
          ok: true,
          already_approved: true,
          payment_url: quotation.payment_link_url,
          project_id: quotation.auto_project_id,
          approved_at: quotation.client_approved_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = new Date().toISOString();

    // 4. Create Razorpay payment link (booking advance = 10%)
    const totalRupees = Number(quotation.total_amount ?? 0);
    const advanceRupees = Math.max(1, Math.round(totalRupees * 0.1));
    const amountPaise = advanceRupees * 100;

    const link_result = await createRazorpayLink({
      amountPaise,
      description: `Booking advance for ${quotation.quotation_number} — ${
        quotation.project_name ?? "Interior project"
      }`,
      customerName: quotation.customer_name,
      customerEmail: quotation.customer_email,
      customerPhone: quotation.customer_phone,
      referenceId: `${quotation.quotation_number}-${Date.now()}`,
      notes: {
        quotation_id: quotation.id,
        quotation_number: quotation.quotation_number,
        lead_id: quotation.lead_id ?? "",
        purpose: "booking_advance",
      },
    });

    // 5. Create project
    const targetEnd = new Date();
    targetEnd.setDate(targetEnd.getDate() + 60);
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .insert({
        name: quotation.project_name || `${quotation.customer_name} — ${quotation.quotation_number}`,
        lead_id: quotation.lead_id,
        quotation_id: quotation.id,
        project_type: quotation.project_type,
        site_address: quotation.project_location ?? quotation.customer_address,
        status: "planning",
        progress_pct: 0,
        budget: totalRupees,
        project_manager: quotation.sales_person,
        start_date: now.slice(0, 10),
        target_end_date: targetEnd.toISOString().slice(0, 10),
        notes: `Auto-created from approved quotation ${quotation.quotation_number}`,
        created_by: "client-approval",
      })
      .select("id")
      .single();
    if (pErr || !project) {
      console.error("Project insert failed", pErr);
      return new Response(JSON.stringify({ error: "Project creation failed", detail: pErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Seed tasks
    const taskRows = SEED_TASKS.map((t) => ({
      title: t.title,
      project_id: project.id,
      lead_id: quotation.lead_id,
      quotation_id: quotation.id,
      priority: "normal",
      created_by: "client-approval",
    }));
    await supabase.from("tasks").insert(taskRows);

    // 7. Seed milestones
    const baseDate = new Date();
    const milestoneRows = SEED_MILESTONES.map((m) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + m.offsetDays);
      return {
        project_id: project.id,
        title: m.title,
        sort_order: m.sort_order,
        target_date: d.toISOString().slice(0, 10),
      };
    });
    await supabase.from("project_milestones").insert(milestoneRows);

    // 8. Update quotation
    await supabase
      .from("quotations")
      .update({
        status: "approved",
        workflow_status: "approved",
        client_approved_at: now,
        decided_at: now,
        decision_note: "Approved by customer via client portal",
        payment_link_url: link_result?.short_url ?? null,
        payment_link_id: link_result?.id ?? null,
        auto_project_id: project.id,
      })
      .eq("id", quotation.id);

    // 9. Workflow log entry
    await supabase.from("quotation_workflow_log").insert({
      quotation_id: quotation.id,
      from_status: quotation.workflow_status,
      to_status: "approved",
      actor: "client (portal)",
      note: "Customer approved via portal — project + payment link generated",
    });

    return new Response(
      JSON.stringify({
        ok: true,
        approved_at: now,
        payment_url: link_result?.short_url ?? null,
        project_id: project.id,
        razorpay_configured: !!link_result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("approve-quotation error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
