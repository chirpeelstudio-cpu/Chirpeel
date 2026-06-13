import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

interface WorkingHours { start: string; end: string; days: number[]; }
const DEFAULT_WH: WorkingHours = { start: "09:00", end: "19:00", days: [1, 2, 3, 4, 5, 6] };

function clampToWorkingHours(input: Date, wh: WorkingHours): Date {
  // Treat input as local time in IST (working_hours are local). We work in UTC math but adjust by IST offset.
  // Simpler: shift to IST minutes, walk forward up to 14 days until inside window, return adjusted UTC.
  const IST_OFFSET_MIN = 330; // +05:30
  const ms = input.getTime();
  let probe = new Date(ms);
  for (let i = 0; i < 14 * 24 * 4; i++) {
    const istMin = (probe.getUTCHours() * 60 + probe.getUTCMinutes() + IST_OFFSET_MIN) % (24 * 60);
    const istDayOfWeek = ((probe.getUTCDay() + (probe.getUTCHours() * 60 + probe.getUTCMinutes() + IST_OFFSET_MIN >= 24 * 60 ? 1 : 0)) % 7);
    const isoDay = ((istDayOfWeek + 6) % 7) + 1; // 1=Mon..7=Sun
    const [sh, sm] = wh.start.split(":").map(Number);
    const [eh, em] = wh.end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (wh.days.includes(isoDay) && istMin >= startMin && istMin <= endMin) {
      return probe;
    }
    // Jump to next day's start if outside window
    if (!wh.days.includes(isoDay) || istMin > endMin) {
      // Move probe forward 30 min and retry
      probe = new Date(probe.getTime() + 30 * 60 * 1000);
    } else {
      // Before start: jump to start
      const delta = startMin - istMin;
      probe = new Date(probe.getTime() + delta * 60 * 1000);
    }
  }
  return input;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GCAL_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!GCAL_KEY) throw new Error("GOOGLE_CALENDAR_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) throw new Error("Unauthorized");

    const body = await req.json();
    const { task_id, action = "upsert", calendar_id = "primary" } = body ?? {};
    if (!task_id) throw new Error("task_id required");

    // Load task with RLS (caller must be allowed to see it)
    const { data: task, error: taskErr } = await supabase
      .from("tasks").select("*").eq("id", task_id).maybeSingle();
    if (taskErr || !task) throw new Error("Task not found or not accessible");

    // Delete branch
    if (action === "delete") {
      if (task.google_event_id) {
        const calId = task.google_calendar_id || "primary";
        await fetch(`${GATEWAY_URL}/calendars/${encodeURIComponent(calId)}/events/${task.google_event_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": GCAL_KEY },
        });
      }
      await admin.from("tasks").update({
        google_event_id: null, google_calendar_id: null,
        calendar_synced_at: null, calendar_html_link: null,
      }).eq("id", task_id);
      return new Response(JSON.stringify({ success: true, deleted: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!task.due_at) throw new Error("Task has no due date");

    // Look up assignee working hours
    let wh: WorkingHours = DEFAULT_WH;
    let tz = "Asia/Kolkata";
    if (task.assigned_to) {
      const { data: prof } = await admin
        .from("profiles")
        .select("working_hours, tz")
        .or(`full_name.eq.${task.assigned_to},email.eq.${task.assigned_to}`)
        .maybeSingle();
      if (prof?.working_hours) wh = prof.working_hours as unknown as WorkingHours;
      if (prof?.tz) tz = prof.tz;
    }

    const due = new Date(task.due_at);
    const startUtc = clampToWorkingHours(due, wh);
    const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000);

    // Lead context for description/link
    let leadLine = "";
    if (task.lead_id) {
      const { data: lead } = await admin
        .from("leads").select("name, phone, project_type, city").eq("id", task.lead_id).maybeSingle();
      if (lead) {
        leadLine = `Lead: ${lead.name ?? ""}${lead.phone ? " · " + lead.phone : ""}${lead.project_type ? " · " + lead.project_type : ""}${lead.city ? " · " + lead.city : ""}\n`;
      }
    }

    const summary = `📋 ${task.title}${task.priority === "high" ? " (HIGH)" : ""}`;
    const description = `${leadLine}Priority: ${task.priority}\nAssigned: ${task.assigned_to ?? "—"}\n\nManaged by Chirpeel CRM. Original due: ${due.toISOString()}`;

    const eventBody = {
      summary,
      description,
      start: { dateTime: startUtc.toISOString(), timeZone: tz },
      end: { dateTime: endUtc.toISOString(), timeZone: tz },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 30 },
          { method: "email", minutes: 60 },
        ],
      },
    };

    let url = `${GATEWAY_URL}/calendars/${encodeURIComponent(calendar_id)}/events`;
    let method = "POST";
    if (task.google_event_id) {
      url = `${GATEWAY_URL}/calendars/${encodeURIComponent(task.google_calendar_id || calendar_id)}/events/${task.google_event_id}`;
      method = "PATCH";
    }

    const gcalRes = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GCAL_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });
    const gcalData = await gcalRes.json();
    if (!gcalRes.ok) {
      // If we tried to PATCH a stale id, retry as POST once
      if (method === "PATCH" && (gcalRes.status === 404 || gcalRes.status === 410)) {
        const retry = await fetch(`${GATEWAY_URL}/calendars/${encodeURIComponent(calendar_id)}/events`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": GCAL_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        });
        const retryData = await retry.json();
        if (!retry.ok) throw new Error(`Google Calendar [${retry.status}]: ${JSON.stringify(retryData)}`);
        Object.assign(gcalData, retryData);
      } else {
        throw new Error(`Google Calendar [${gcalRes.status}]: ${JSON.stringify(gcalData)}`);
      }
    }

    await admin.from("tasks").update({
      google_event_id: gcalData.id,
      google_calendar_id: calendar_id,
      calendar_synced_at: new Date().toISOString(),
      calendar_html_link: gcalData.htmlLink ?? null,
    }).eq("id", task_id);

    return new Response(JSON.stringify({
      success: true,
      event_id: gcalData.id,
      html_link: gcalData.htmlLink,
      scheduled_for: startUtc.toISOString(),
      adjusted: startUtc.getTime() !== due.getTime(),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("sync-task-to-calendar error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
