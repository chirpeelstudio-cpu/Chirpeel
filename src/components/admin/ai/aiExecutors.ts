import { supabase } from "@/integrations/supabase/client";

// Each executor takes the proposal payload that came back from the edge function
// and performs the actual write using the signed-in user's session (so RLS applies).
// Returns a short human-readable success line plus an optional deep link.

export type ExecResult = { ok: true; message: string; href?: string } | { ok: false; error: string };

const todayISO = () => new Date().toISOString().slice(0, 10);

export async function execCreateLead(payload: Record<string, unknown>): Promise<ExecResult> {
  const insert = { ...payload, stage: "leads", status: "new_lead" } as never;
  const { data, error } = await supabase.from("leads").insert(insert).select("id, name").maybeSingle();
  if (error || !data) return { ok: false, error: error?.message || "Insert failed" };
  return { ok: true, message: `Lead created — ${data.name}`, href: `/studio/crm?lead=${data.id}` };
}

export async function execUpdateLead(payload: { id: string; changes: Record<string, unknown> }): Promise<ExecResult> {
  const { error } = await supabase.from("leads").update(payload.changes as never).eq("id", payload.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Lead updated", href: `/studio/crm?lead=${payload.id}` };
}

export async function execDeleteLead(payload: { id: string }): Promise<ExecResult> {
  const { error } = await supabase.from("leads").update({ deleted_at: new Date().toISOString() } as never).eq("id", payload.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Lead moved to trash" };
}

export async function execUpdateBrandPrice(payload: { id: string; new_rate_per_sqft: number }): Promise<ExecResult> {
  const { error } = await supabase.from("brand_catalog").update({ rate_per_sqft: payload.new_rate_per_sqft } as never).eq("id", payload.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Brand rate updated" };
}

export async function execUpdatePricingItem(payload: { id: string; changes: Record<string, unknown> }): Promise<ExecResult> {
  const { error } = await supabase.from("pricing_catalog").update(payload.changes as never).eq("id", payload.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Pricing updated" };
}

export async function execCreateQuotation(payload: { lead_id: string; project_name?: string | null; rooms?: string[]; notes?: string | null }): Promise<ExecResult> {
  // We don't run save_quotation directly — the builder needs the user to pick rooms/items.
  // Open the builder with prefill params; it will create the draft on first save.
  const params = new URLSearchParams({ lead: payload.lead_id });
  if (payload.project_name) params.set("project", payload.project_name);
  if (payload.rooms?.length) params.set("rooms", payload.rooms.join(","));
  if (payload.notes) params.set("notes", payload.notes);
  return { ok: true, message: "Opening quotation builder…", href: `/studio/quotation?${params.toString()}` };
}

export async function execTransitionQuotation(payload: { quotation_id: string; to_status: string; note?: string | null }): Promise<ExecResult> {
  const { error } = await supabase.rpc("transition_quotation_workflow", {
    _quotation_id: payload.quotation_id, _to: payload.to_status, _note: payload.note ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: `Quotation moved to ${payload.to_status}`, href: `/studio/quotations` };
}

export async function execSendQuotation(payload: { quotation_id: string; channel: string }): Promise<ExecResult> {
  const { data, error } = await supabase.functions.invoke("send-quotation", { body: { quotation_id: payload.quotation_id, channel: payload.channel } });
  if (error) return { ok: false, error: error.message };
  const msg = (data as { message?: string })?.message || "Quotation sent";
  return { ok: true, message: msg };
}

export async function execRecordPayment(payload: {
  lead_id?: string | null; invoice_id?: string | null; amount: number;
  mode: string; paid_on?: string | null; milestone?: string | null;
  reference?: string | null; notes?: string | null;
}): Promise<ExecResult> {
  const insert = {
    lead_id: payload.lead_id ?? null,
    invoice_id: payload.invoice_id ?? null,
    amount: payload.amount,
    mode: payload.mode || "upi",
    paid_on: payload.paid_on || todayISO(),
    milestone: payload.milestone ?? null,
    reference: payload.reference ?? null,
    notes: payload.notes ?? null,
  };
  const { data: _d, error } = await supabase.from("payments").insert(insert as never).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  void _d;
  return { ok: true, message: `Payment of ₹${payload.amount.toLocaleString("en-IN")} recorded`, href: payload.lead_id ? `/studio/crm?lead=${payload.lead_id}` : "/studio/finance" };
}

export async function execAddExpense(payload: Record<string, unknown>): Promise<ExecResult> {
  const { error } = await supabase.from("expenses").insert(payload as never);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Expense added", href: "/studio/finance" };
}

export async function execSendWhatsapp(payload: { lead_id: string; body: string; phone?: string | null; template_key?: string | null }): Promise<ExecResult> {
  // 1) Log it in lead_messages so it shows in the timeline.
  const { error: logErr } = await supabase.from("lead_messages").insert({
    lead_id: payload.lead_id,
    channel: "whatsapp",
    body: payload.body,
    template_key: payload.template_key ?? null,
  } as never);
  if (logErr) return { ok: false, error: logErr.message };
  // 2) Open WhatsApp Web/app so the user can send (avoids needing a Cloud API token).
  const phone = (payload.phone || "").replace(/\D/g, "");
  if (phone) {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(payload.body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return { ok: true, message: phone ? "Logged & opened WhatsApp" : "Logged (no phone)", href: `/studio/crm?lead=${payload.lead_id}` };
}

export async function execUpdateCompanySettings(payload: { changes: Record<string, unknown> }): Promise<ExecResult> {
  // company_settings has 1 row per tenant; update via tenant filter (RLS will enforce).
  const { data: existing } = await supabase.from("company_settings").select("id").limit(1).maybeSingle();
  if (!existing) {
    const { error } = await supabase.from("company_settings").insert(payload.changes as never);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("company_settings").update(payload.changes as never).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true, message: "Company settings updated", href: "/studio/settings" };
}

// ---- Tasks ----
export async function execCreateTask(payload: Record<string, unknown>): Promise<ExecResult> {
  const { data, error } = await supabase.from("tasks").insert(payload as never).select("id, title").maybeSingle();
  if (error || !data) return { ok: false, error: error?.message || "Insert failed" };
  return { ok: true, message: `Task created — ${data.title}`, href: `/studio/tasks` };
}
export async function execAssignTask(payload: { id: string; changes: { assigned_to: string | null } }): Promise<ExecResult> {
  const { error } = await supabase.from("tasks").update(payload.changes as never).eq("id", payload.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Task reassigned", href: "/studio/tasks" };
}
export async function execCompleteTask(payload: { id: string }): Promise<ExecResult> {
  const { error } = await supabase.from("tasks").update({ completed_at: new Date().toISOString() } as never).eq("id", payload.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Task completed", href: "/studio/tasks" };
}
export async function execRescheduleTask(payload: { id: string; changes: { due_at: string } }): Promise<ExecResult> {
  const { error } = await supabase.from("tasks").update(payload.changes as never).eq("id", payload.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Task rescheduled", href: "/studio/tasks" };
}

// ---- Team invite ----
export async function execInviteTeamMember(payload: { email: string; name?: string | null; phone?: string | null; role: string }): Promise<ExecResult> {
  // 1) Insert invite row (RLS enforces admin/manager only)
  const insert = {
    email: payload.email,
    name: payload.name ?? null,
    phone: payload.phone ?? null,
    proposed_role: payload.role,
  };
  const { data, error } = await supabase.from("team_invites").insert(insert as never).select("id, token, email").maybeSingle();
  if (error || !data) return { ok: false, error: error?.message || "Could not create invite (admin only)" };
  // 2) Best-effort: ask edge function to email it. If it fails, still surface the link.
  const inviteUrl = `${window.location.origin}/accept-invite?token=${(data as { token: string }).token}`;
  try {
    await supabase.functions.invoke("send-team-invite", { body: { invite_id: (data as { id: string }).id } });
  } catch {
    /* email is best-effort; admin can copy link */
  }
  return { ok: true, message: `Invite sent to ${payload.email}`, href: inviteUrl };
}

// ---- Purchase orders ----
export async function execCreatePurchaseOrder(payload: Record<string, unknown>): Promise<ExecResult> {
  // PO number: HC-PO-YYYY-XXXX (simple count-based)
  const year = new Date().getFullYear();
  const { count } = await supabase.from("purchase_orders").select("id", { count: "exact", head: true }).gte("created_at", `${year}-01-01`);
  const seq = String((count ?? 0) + 1).padStart(4, "0");
  const po_number = `HC-PO-${year}-${seq}`;
  const insert = { ...payload, po_number } as never;
  const { data, error } = await supabase.from("purchase_orders").insert(insert).select("id, po_number").maybeSingle();
  if (error || !data) return { ok: false, error: error?.message || "Insert failed" };
  return { ok: true, message: `PO created — ${data.po_number}`, href: `/studio/purchase-orders` };
}
export async function execUpdatePoStatus(payload: { id: string; to_status: string; from_status?: string; note?: string | null }): Promise<ExecResult> {
  const { error } = await supabase.from("purchase_orders").update({ status: payload.to_status } as never).eq("id", payload.id);
  if (error) return { ok: false, error: error.message };
  // Best-effort history log
  await supabase.from("po_status_history").insert({
    purchase_order_id: payload.id,
    from_status: payload.from_status ?? null,
    to_status: payload.to_status,
    note: payload.note ?? null,
  } as never);
  return { ok: true, message: `PO moved to ${payload.to_status}`, href: "/studio/purchase-orders" };
}
export async function execSendPoToVendor(payload: { purchase_order_id: string }): Promise<ExecResult> {
  const { data, error } = await supabase.functions.invoke("send-vendor-po", { body: { purchase_order_id: payload.purchase_order_id } });
  if (error) return { ok: false, error: error.message };
  const msg = (data as { message?: string })?.message || "PO emailed to vendor";
  return { ok: true, message: msg, href: "/studio/purchase-orders" };
}

export const EXECUTORS: Record<string, (payload: any) => Promise<ExecResult>> = {
  create_lead: execCreateLead,
  update_lead: execUpdateLead,
  delete_lead: execDeleteLead,
  update_brand_price: execUpdateBrandPrice,
  update_pricing_item: execUpdatePricingItem,
  create_quotation: execCreateQuotation,
  transition_quotation: execTransitionQuotation,
  send_quotation: execSendQuotation,
  record_payment: execRecordPayment,
  add_expense: execAddExpense,
  send_whatsapp: execSendWhatsapp,
  update_company_settings: execUpdateCompanySettings,
  create_task: execCreateTask,
  assign_task: execAssignTask,
  complete_task: execCompleteTask,
  reschedule_task: execRescheduleTask,
  invite_team_member: execInviteTeamMember,
  create_purchase_order: execCreatePurchaseOrder,
  update_po_status: execUpdatePoStatus,
  send_po_to_vendor: execSendPoToVendor,
};