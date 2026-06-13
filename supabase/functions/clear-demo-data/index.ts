// Edge function: deletes all rows seeded by seed-starter-data for the caller's tenant.
// Identifies demo rows by the "[DEMO — safe to delete]" marker in their notes/details/description.
// Only callers with admin/owner/manager roles in the tenant may invoke.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_TAG = "[DEMO — safe to delete]";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve tenant for caller
    const { data: member } = await admin
      .from("team_members")
      .select("tenant_id")
      .eq("user_id", userId)
      .maybeSingle();
    const tenantId = (member as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) return json({ error: "No tenant for caller" }, 403);

    // Authorize: admin, owner or manager
    const allowedRoles = ["admin", "owner", "manager"] as const;
    let allowed = false;
    for (const r of allowedRoles) {
      const { data } = await admin.rpc("has_role", { _user_id: userId, _role: r });
      if (data) { allowed = true; break; }
    }
    if (!allowed) return json({ error: "Admins/Owners only" }, 403);

    const tag = `%${DEMO_TAG}%`;
    const counts: Record<string, number> = {};

    // notes-based tables
    for (const t of ["expenses", "payments", "invoices", "vendors", "projects"]) {
      const { data, error } = await admin
        .from(t)
        .delete()
        .eq("tenant_id", tenantId)
        .ilike("notes", tag)
        .select("id");
      if (error) return json({ error: `${t}: ${error.message}` }, 500);
      counts[t] = data?.length ?? 0;
    }

    // details-based table (leads)
    {
      const { data, error } = await admin
        .from("leads")
        .delete()
        .eq("tenant_id", tenantId)
        .ilike("details", tag)
        .select("id");
      if (error) return json({ error: `leads: ${error.message}` }, 500);
      counts.leads = data?.length ?? 0;
    }

    // description-based table (pricing_catalog)
    {
      const { data, error } = await admin
        .from("pricing_catalog")
        .delete()
        .eq("tenant_id", tenantId)
        .ilike("description", tag)
        .select("id");
      if (error) return json({ error: `pricing_catalog: ${error.message}` }, 500);
      counts.pricing_catalog = data?.length ?? 0;
    }

    return json({ ok: true, deleted: counts });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}