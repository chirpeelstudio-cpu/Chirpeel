// Sends a team invite email with the accept link.
// Best-effort: if email infra is not configured, returns ok with a fallback note —
// the admin can copy the link from the chat card.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "Missing Authorization" }, 401);

    const body = await req.json().catch(() => ({}));
    const inviteId: string | undefined = body?.invite_id;
    if (!inviteId) return j({ error: "invite_id required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: invite, error } = await sb.from("team_invites")
      .select("id, email, name, proposed_role, token, tenant_id")
      .eq("id", inviteId).maybeSingle();
    if (error || !invite) return j({ error: "Invite not found" }, 404);

    // Resolve studio name (best-effort)
    const { data: settings } = await sb.from("company_settings")
      .select("company_name").eq("tenant_id", (invite as any).tenant_id).maybeSingle();
    const studio = (settings as any)?.company_name ?? "your studio";

    const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
    const base = origin.split("/").slice(0, 3).join("/") || "https://chirpeel.lovable.app";
    const acceptUrl = `${base}/accept-invite?token=${(invite as any).token}`;

    // Try Lovable Emails (transactional). If not configured, just return the link.
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#fff;color:#111;padding:24px">
      <h2 style="color:#0F2C5F">You're invited to join ${escape(studio)}</h2>
      <p>Hi ${escape((invite as any).name ?? "")},</p>
      <p>You've been invited as <strong>${escape((invite as any).proposed_role)}</strong>. Click below to accept and create your account.</p>
      <p><a href="${acceptUrl}" style="display:inline-block;background:#0F2C5F;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Accept invite</a></p>
      <p style="color:#666;font-size:12px">Or copy this link: ${acceptUrl}</p>
      <p style="color:#999;font-size:12px">This invite expires in 7 days.</p>
    </body></html>`;

    try {
      const r = await sb.functions.invoke("send-transactional-email", {
        body: {
          to: (invite as any).email,
          subject: `You're invited to join ${studio} on Chirpeel`,
          html,
          purpose: "transactional",
          idempotency_key: `team-invite-${inviteId}`,
        },
      });
      if (r.error) throw r.error;
      return j({ ok: true, message: `Invite emailed to ${(invite as any).email}`, accept_url: acceptUrl });
    } catch (_e) {
      return j({ ok: true, message: `Invite created (email not configured) — share this link manually`, accept_url: acceptUrl });
    }
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}