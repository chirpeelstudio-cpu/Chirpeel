// Edge function: create a team member auth account + profile + role link.
// Caller must be an authenticated admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AppRole = "owner" | "admin" | "manager" | "designer" | "sales" | "installer" | "accounts";

interface Body {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: AppRole;
  role_label?: string;
  permissions: Record<string, boolean>;
  team_member_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing auth" }, 401);

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const body = (await req.json()) as Body;
    if (!body.email || !body.password || !body.full_name || !body.role) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (body.password.length < 6) return json({ error: "Password too short" }, 400);

    // Create auth user (auto-confirm). If email already exists, return a friendly error.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Failed to create user";
      const lower = msg.toLowerCase();
      if (
        lower.includes("already been registered") ||
        lower.includes("already registered") ||
        lower.includes("already exists") ||
        lower.includes("duplicate")
      ) {
        return json(
          {
            error:
              "This email is already in use. Use a different login email, or remove the existing account first.",
            code: "email_exists",
          },
          409,
        );
      }
      return json({ error: msg }, 400);
    }
    const newUserId = created.user.id;

    // Upsert profile (trigger creates a base row; we update with full data)
    await admin.from("profiles").upsert({
      id: newUserId,
      email: body.email,
      full_name: body.full_name,
      phone: body.phone ?? null,
      role_label: body.role_label ?? body.role,
      active: true,
      permissions: body.permissions,
    });

    // Insert role
    await admin.from("user_roles").insert({ user_id: newUserId, role: body.role });

    // Link team_members row if provided, else create one
    if (body.team_member_id) {
      await admin.from("team_members").update({ user_id: newUserId, active: true })
        .eq("id", body.team_member_id);
    } else {
      await admin.from("team_members").insert({
        name: body.full_name,
        email: body.email,
        phone: body.phone ?? null,
        role: body.role_label ?? body.role,
        active: true,
        user_id: newUserId,
      });
    }

    return json({ ok: true, user_id: newUserId });
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
