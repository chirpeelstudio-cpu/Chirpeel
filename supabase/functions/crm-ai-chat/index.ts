// CRM Assistant — Lovable AI Gateway with tool-calling, scoped to caller's tenant via RLS.
// Non-streaming: model loops until it produces a final assistant message, then we return
// { reply, actions } to the client. Actions are "draft + confirm" payloads — never auto-sent.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Chirpeel AI, an assistant embedded inside an interior-design studio's CRM in India.
You help the studio owner operate the entire pipeline end-to-end: find leads, change pricing, draft and send quotations, record payments, schedule follow-ups, send WhatsApp, manage tasks, invite teammates, raise purchase orders to vendors, and update settings.

Rules:
- ALWAYS use the provided tools to look up real data — never invent lead names, numbers, amounts, or vendors.
- Currency is INR; format money as "₹1,23,400" (Indian numbering).
- Be terse. Prefer bulleted lists. No flattery. No "Sure! I'd be happy to..." preambles.
- For ANY change to the database (create / update / delete / send), call the matching propose_* tool. The UI will show the user a confirmation card and only write after they click Confirm. Never claim something was done — say a proposal is ready below.
- Always look up the target record first (search_leads, get_quotation_status, etc.) so you have the real id before proposing a write. Never make up ids.
- For tasks: resolve the assignee with list_team_members first so assigned_to matches a real teammate name.
- For purchase orders: resolve the vendor with find_vendor first.
- Inviting a team member grants studio access — only admins can confirm. Default role is "sales" unless asked otherwise.
- Cap yourself at 3 proposals per turn. If the user wants a bulk change, propose one representative card and ask them to confirm scope.
- Before telling the user a record is "not found", you MUST call the matching search tool in THIS turn (search_leads, get_quotation_status, find_vendor, list_team_members, list_purchase_orders). Never rely on prior turns — data may have changed (e.g. the user just confirmed a create_* action and the record now exists).
- If a previous assistant message starts with "[system]" it is a confirmation log of a write the user just approved (with the real id). Trust it: do not re-propose the same action, and use the id directly when referencing the record.
- If, after searching, you still can't find what they asked, say so plainly and suggest the closest tool.
- All data you see is already filtered to the user's own studio (tenant). Do not mention tenants.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_leads",
      description: "Find leads by name, phone, city, or details text. Optionally filter by pipeline stage.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free text. Empty string = no text filter." },
          stage: { type: "string", description: "Optional pipeline stage: leads | followup | site_visit | quote_sent | negotiation | won | lost | onhold" },
          limit: { type: "number", description: "Max rows. Default 10." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_summary",
      description: "Counts of leads per pipeline stage, plus overdue follow-ups and leads added in the last 7 days.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_finance_summary",
      description: "Pending invoice total, paid this month, overdue amount, oldest overdue age in days.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_overdue_followups",
      description: "Leads whose next_followup_date is in the past (or today). Use when user asks who needs calling.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Default 10." } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_vendor",
      description: "Search vendors by name or category (hardware, laminate, core_material, carpenter, etc).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: "string" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quotation_status",
      description: "Recent quotations with workflow status (draft, sent, approved, rejected, etc). Optional lead name filter.",
      parameters: {
        type: "object",
        properties: { lead_name: { type: "string" }, limit: { type: "number" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_whatsapp_message",
      description: "Compose a WhatsApp message to a lead. Returns a draft for the user to review and send manually. NEVER actually sends.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "UUID of the lead — get from search_leads first." },
          intent: { type: "string", description: "What the message should say in plain English (e.g. 'follow up on quotation', 'confirm site visit Tuesday 11am')." },
        },
        required: ["lead_id", "intent"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_followup",
      description: "Prepare a follow-up reminder for a lead at a future date. Returns a draft — the user clicks to confirm.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          days_from_now: { type: "number", description: "1 = tomorrow." },
          note: { type: "string" },
        },
        required: ["lead_id", "days_from_now", "note"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_quotation_link",
      description: "Get a deep-link to open the quotation builder for this lead. Use when user wants to draft / edit a quote.",
      parameters: {
        type: "object",
        properties: { lead_id: { type: "string" } },
        required: ["lead_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_site_visit",
      description: "Draft a site-visit follow-up for a lead on a given date.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          date_iso: { type: "string", description: "ISO date YYYY-MM-DD" },
          time_label: { type: "string", description: "e.g. '11:00 AM'" },
        },
        required: ["lead_id", "date_iso"],
        additionalProperties: false,
      },
    },
  },
  // ============ WRITE PROPOSERS — never auto-execute ============
  {
    type: "function",
    function: {
      name: "propose_create_lead",
      description: "Propose creating a new lead. Returns a confirm card; user clicks to actually insert.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          city: { type: "string" },
          project_type: { type: "string", description: "e.g. kitchen, full_home, wardrobe" },
          budget: { type: "string" },
          timeline: { type: "string" },
          source: { type: "string", description: "Default: ai_assistant" },
          details: { type: "string" },
          assigned_to: { type: "string", description: "Email/identifier of teammate to assign" },
        },
        required: ["name", "phone"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_update_lead",
      description: "Propose updating any field of an existing lead (stage, status, assignment, contact info, budget, timeline, details, follow-up date, payment flags). Only include fields you want changed.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          name: { type: "string" }, phone: { type: "string" }, email: { type: "string" },
          city: { type: "string" }, pincode: { type: "string" },
          project_type: { type: "string" }, budget: { type: "string" }, timeline: { type: "string" },
          details: { type: "string" }, source: { type: "string" }, assigned_to: { type: "string" },
          stage: { type: "string", description: "leads | followup | site_visit | quote_sent | negotiation | won | lost | onhold" },
          status: { type: "string" },
          next_followup_date: { type: "string", description: "ISO datetime or YYYY-MM-DD" },
        },
        required: ["lead_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_delete_lead",
      description: "Propose soft-deleting a lead (sets deleted_at). Destructive — confirm card is red.",
      parameters: {
        type: "object",
        properties: { lead_id: { type: "string" } },
        required: ["lead_id"], additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_update_brand_price",
      description: "Propose changing the rate per sqft for a brand in the catalog. Search by name/category if you don't have the id.",
      parameters: {
        type: "object",
        properties: {
          brand_id: { type: "string" },
          brand_name: { type: "string", description: "Used only if brand_id is unknown — server will resolve." },
          category: { type: "string" },
          new_rate_per_sqft: { type: "number" },
        },
        required: ["new_rate_per_sqft"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_update_pricing_item",
      description: "Propose changing rate_per_sqft and/or fixed_cost on a row in pricing_catalog (e.g. kitchen base unit). Use after listing matches.",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "string" },
          item_name: { type: "string", description: "Resolve by name if id unknown." },
          new_rate_per_sqft: { type: "number" },
          new_fixed_cost: { type: "number" },
          active: { type: "boolean" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_create_quotation",
      description: "Propose creating a draft quotation for a lead. The card opens the quotation builder with the lead and any pre-filled rooms/items so the user can review then save inside the builder.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          project_name: { type: "string" },
          rooms: {
            type: "array",
            description: "Optional rooms preset (e.g. kitchen, mbr, living).",
            items: { type: "string" },
          },
          notes: { type: "string" },
        },
        required: ["lead_id"], additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_transition_quotation",
      description: "Propose moving a quotation to a new workflow stage (submit_for_review | approve | reject | mark_sent | revise). Search quotations first to get the id.",
      parameters: {
        type: "object",
        properties: {
          quotation_id: { type: "string" },
          to_status: { type: "string", description: "draft | review | approved | sent | revised | rejected" },
          note: { type: "string" },
        },
        required: ["quotation_id", "to_status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_send_quotation",
      description: "Propose sending an approved quotation to the client (triggers send-quotation edge function). Destructive — red card.",
      parameters: {
        type: "object",
        properties: {
          quotation_id: { type: "string" },
          channel: { type: "string", description: "whatsapp | email" },
        },
        required: ["quotation_id"], additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_record_payment",
      description: "Propose recording a payment received from a client. Lead_id OR invoice_id required.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          invoice_id: { type: "string" },
          amount: { type: "number" },
          mode: { type: "string", description: "upi | bank | cash | cheque | card" },
          paid_on: { type: "string", description: "YYYY-MM-DD; defaults to today" },
          milestone: { type: "string" },
          reference: { type: "string" },
          notes: { type: "string" },
        },
        required: ["amount"], additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_add_expense",
      description: "Propose adding an expense entry (material/labour/etc).",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          category: { type: "string" },
          vendor: { type: "string" },
          description: { type: "string" },
          payment_mode: { type: "string" },
          expense_date: { type: "string", description: "YYYY-MM-DD" },
          lead_id: { type: "string" },
        },
        required: ["amount"], additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_send_whatsapp",
      description: "Propose sending a WhatsApp message to a lead AND logging it in lead_messages (after the user confirms). For a draft-only message use draft_whatsapp_message instead.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          body: { type: "string" },
          template_key: { type: "string" },
        },
        required: ["lead_id", "body"], additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_update_company_settings",
      description: "Propose updating company_settings fields (contact info, accent_color, currency, terms, etc). Only include fields you want changed.",
      parameters: {
        type: "object",
        properties: {
          company_name: { type: "string" }, tagline: { type: "string" },
          phone: { type: "string" }, whatsapp: { type: "string" }, email: { type: "string" },
          website: { type: "string" }, gstin: { type: "string" },
          address_line1: { type: "string" }, address_line2: { type: "string" },
          city: { type: "string" }, state: { type: "string" }, pincode: { type: "string" },
          accent_color: { type: "string" }, header_color: { type: "string" },
          default_terms: { type: "string" },
          default_gst_rate: { type: "number" }, default_validity_days: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
];
// ============ NEW TOOLS: tasks, team invites, purchase orders ============
TOOLS.push(
  // ---- READ ----
  {
    type: "function",
    function: {
      name: "list_team_members",
      description: "List active team members in the studio. Use to resolve a name like 'Karthik' to the right assigned_to value.",
      parameters: { type: "object", properties: { query: { type: "string" } }, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List tasks. Filter by status (open/done), assignee, or lead_id.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "open | done | all (default open)" },
          assigned_to: { type: "string" },
          lead_id: { type: "string" },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_purchase_orders",
      description: "List recent purchase orders. Optional vendor or status filter.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "draft | sent | acknowledged | received | cancelled" },
          vendor_query: { type: "string" },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  // ---- WRITE PROPOSERS: tasks ----
  {
    type: "function",
    function: {
      name: "propose_create_task",
      description: "Propose creating a task assigned to a teammate. Resolve the assignee using list_team_members first.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          assigned_to: { type: "string", description: "Name or email of the teammate (must match team_members.name or .email)." },
          due_at: { type: "string", description: "ISO datetime or YYYY-MM-DD." },
          priority: { type: "string", enum: ["low","normal","high","urgent"], description: "Task priority (default normal)" },
          lead_id: { type: "string" },
          project_id: { type: "string" },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_assign_task",
      description: "Propose reassigning an existing task to a different teammate.",
      parameters: {
        type: "object",
        properties: { task_id: { type: "string" }, assigned_to: { type: "string" } },
        required: ["task_id", "assigned_to"], additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_complete_task",
      description: "Propose marking a task as complete.",
      parameters: {
        type: "object",
        properties: { task_id: { type: "string" } },
        required: ["task_id"], additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_reschedule_task",
      description: "Propose changing the due date of a task.",
      parameters: {
        type: "object",
        properties: { task_id: { type: "string" }, due_at: { type: "string", description: "ISO datetime or YYYY-MM-DD" } },
        required: ["task_id", "due_at"], additionalProperties: false,
      },
    },
  },
  // ---- WRITE PROPOSER: team invites ----
  {
    type: "function",
    function: {
      name: "propose_invite_team_member",
      description: "Propose inviting a new team member by email. The user must confirm. Only admins/managers can confirm. Destructive — grants studio access.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string" },
          name: { type: "string" },
          phone: { type: "string" },
          role: { type: "string", description: "admin | manager | sales | designer | accounts (default sales)" },
        },
        required: ["email"], additionalProperties: false,
      },
    },
  },
  // ---- WRITE PROPOSERS: purchase orders ----
  {
    type: "function",
    function: {
      name: "propose_create_purchase_order",
      description: "Propose creating a purchase order for a vendor. Use find_vendor first to resolve vendor_id.",
      parameters: {
        type: "object",
        properties: {
          vendor_id: { type: "string" },
          vendor_name: { type: "string", description: "Used only if vendor_id unknown — server resolves." },
          project_id: { type: "string" },
          lead_id: { type: "string" },
          amount: { type: "number" },
          gst_rate: { type: "number", description: "Default 18" },
          description: { type: "string" },
          po_date: { type: "string", description: "YYYY-MM-DD; defaults to today" },
        },
        required: ["amount"], additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_update_po_status",
      description: "Propose moving a PO between draft → sent → acknowledged → received → cancelled. Logs to po_status_history.",
      parameters: {
        type: "object",
        properties: {
          purchase_order_id: { type: "string" },
          to_status: { type: "string" },
          note: { type: "string" },
        },
        required: ["purchase_order_id", "to_status"], additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_send_po_to_vendor",
      description: "Propose emailing the PO to the vendor (uses send-vendor-po edge function). Destructive — sends external communication.",
      parameters: {
        type: "object",
        properties: { purchase_order_id: { type: "string" } },
        required: ["purchase_order_id"], additionalProperties: false,
      },
    },
  },
);

type Action = {
  kind:
    | "whatsapp" | "followup" | "open_quotation" | "site_visit"
    | "create_lead" | "update_lead" | "delete_lead"
    | "update_brand_price" | "update_pricing_item"
    | "create_quotation" | "transition_quotation" | "send_quotation"
    | "record_payment" | "add_expense"
    | "send_whatsapp" | "update_company_settings"
    | "create_task" | "assign_task" | "complete_task" | "reschedule_task"
    | "invite_team_member"
    | "create_purchase_order" | "update_po_status" | "send_po_to_vendor";
  destructive?: boolean;
  title?: string;
  summary?: string;
  fields?: Array<{ label: string; value: string }>;
  payload?: Record<string, unknown>;
  lead_id?: string;
  lead_name?: string;
  lead_phone?: string;
  draft_text?: string;
  date_iso?: string;
  time_label?: string;
  days_from_now?: number;
  url?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured" }, 500);

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return json({ error: "Body must be { messages: [{role, content}] }" }, 400);
    }
    const voiceMode = body.voice_mode === true;

    // Caller-scoped client → all tool reads obey RLS.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);

    const actions: Action[] = [];

    // Build conversation
    const convo: Array<Record<string, unknown>> = [
      {
        role: "system",
        content: voiceMode
          ? SYSTEM_PROMPT +
            "\n\nVOICE MODE: You are on a hands-free phone call with the studio owner. Keep replies short (1–3 sentences), warm and conversational, like talking to a colleague. Avoid lists, markdown, or URLs. Ask one follow-up question at a time. Use natural language ('I found three leads — the most urgent is Priya from Tirupur') rather than data dumps."
          : SYSTEM_PROMPT,
      },
      ...(body.messages as Array<{
        role: string;
        content: string;
        attachments?: Array<{ url: string; name: string; mime: string; kind: "image" | "file" }>;
      }>).map((m) => {
        const atts = Array.isArray(m.attachments) ? m.attachments : [];
        if (m.role !== "user" || atts.length === 0) {
          return { role: m.role, content: m.content };
        }
        // Multimodal content: text + image_url parts. Non-image files are referenced
        // by URL in the text so the model knows where to look.
        const parts: Array<Record<string, unknown>> = [];
        const fileLines = atts
          .filter((a) => a.kind !== "image")
          .map((a) => `- ${a.name} (${a.mime}): ${a.url}`)
          .join("\n");
        const text = [
          m.content || "(no message)",
          fileLines ? `\n\nAttached files:\n${fileLines}` : "",
        ].join("");
        parts.push({ type: "text", text });
        for (const a of atts) {
          if (a.kind === "image") parts.push({ type: "image_url", image_url: { url: a.url } });
        }
        return { role: m.role, content: parts };
      }),
    ];

    // Tool loop — cap at 6 hops to prevent runaway.
    let finalText = "";
    for (let hop = 0; hop < 6; hop++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: convo,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (aiResp.status === 429) return json({ error: "Rate limit hit. Try again in a moment." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }, 402);
      if (!aiResp.ok) {
        const t = await aiResp.text();
        console.error("AI gateway error", aiResp.status, t);
        return json({ error: "AI gateway error" }, 500);
      }

      const data = await aiResp.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) return json({ error: "Empty AI response" }, 500);

      const toolCalls = msg.tool_calls as Array<{
        id: string; type: string; function: { name: string; arguments: string };
      }> | undefined;

      if (!toolCalls || toolCalls.length === 0) {
        finalText = String(msg.content ?? "").trim();
        break;
      }

      // Push assistant message with tool_calls verbatim
      convo.push(msg);

      // Execute each tool, append a tool message with the result
      for (const tc of toolCalls) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments || "{}"); } catch { args = {}; }
        const result = await runTool(userClient, tc.function.name, args, actions);
        convo.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    if (!finalText) finalText = "I couldn't form a reply — try rephrasing.";

    // Stream the final reply as SSE so the UI can render token-by-token.
    // We chunk the already-computed finalText into small pieces for a smooth typing effect,
    // then emit a single "actions" event followed by [DONE].
    const wantsStream = req.headers.get("accept")?.includes("text/event-stream")
      || new URL(req.url).searchParams.get("stream") === "1";

    if (!wantsStream) {
      return json({ reply: finalText, actions }, 200);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Chunk by ~3-char groups, preserving word boundaries where possible.
          const text = finalText;
          const chunks: string[] = [];
          let buf = "";
          for (const ch of text) {
            buf += ch;
            if (buf.length >= 3 && (ch === " " || ch === "\n" || buf.length >= 6)) {
              chunks.push(buf);
              buf = "";
            }
          }
          if (buf) chunks.push(buf);

          for (const c of chunks) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: c })}\n\n`));
            // Tiny delay so the client sees progressive rendering.
            await new Promise((r) => setTimeout(r, 18));
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ actions })}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("crm-ai-chat error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

// =============================================================================
// Tool dispatcher
// =============================================================================
async function runTool(
  sb: ReturnType<typeof createClient>,
  name: string,
  args: Record<string, unknown>,
  actions: Action[],
): Promise<unknown> {
  try {
    switch (name) {
      case "search_leads": return await searchLeads(sb, args);
      case "get_pipeline_summary": return await pipelineSummary(sb);
      case "get_finance_summary": return await financeSummary(sb);
      case "list_overdue_followups": return await listOverdueFollowups(sb, args);
      case "find_vendor": return await findVendor(sb, args);
      case "get_quotation_status": return await getQuotationStatus(sb, args);
      case "draft_whatsapp_message": return await draftWhatsapp(sb, args, actions);
      case "draft_followup": return await draftFollowup(sb, args, actions);
      case "prepare_quotation_link": return await prepareQuotationLink(sb, args, actions);
      case "prepare_site_visit": return await prepareSiteVisit(sb, args, actions);
      case "propose_create_lead": return await proposeCreateLead(args, actions);
      case "propose_update_lead": return await proposeUpdateLead(sb, args, actions);
      case "propose_delete_lead": return await proposeDeleteLead(sb, args, actions);
      case "propose_update_brand_price": return await proposeUpdateBrandPrice(sb, args, actions);
      case "propose_update_pricing_item": return await proposeUpdatePricingItem(sb, args, actions);
      case "propose_create_quotation": return await proposeCreateQuotation(sb, args, actions);
      case "propose_transition_quotation": return await proposeTransitionQuotation(sb, args, actions);
      case "propose_send_quotation": return await proposeSendQuotation(sb, args, actions);
      case "propose_record_payment": return await proposeRecordPayment(sb, args, actions);
      case "propose_add_expense": return await proposeAddExpense(args, actions);
      case "propose_send_whatsapp": return await proposeSendWhatsapp(sb, args, actions);
      case "propose_update_company_settings": return await proposeUpdateCompanySettings(args, actions);
      case "list_team_members": return await listTeamMembers(sb, args);
      case "list_tasks": return await listTasks(sb, args);
      case "list_purchase_orders": return await listPurchaseOrders(sb, args);
      case "propose_create_task": return await proposeCreateTask(sb, args, actions);
      case "propose_assign_task": return await proposeAssignTask(sb, args, actions);
      case "propose_complete_task": return await proposeCompleteTask(sb, args, actions);
      case "propose_reschedule_task": return await proposeRescheduleTask(sb, args, actions);
      case "propose_invite_team_member": return await proposeInviteTeamMember(sb, args, actions);
      case "propose_create_purchase_order": return await proposeCreatePurchaseOrder(sb, args, actions);
      case "propose_update_po_status": return await proposeUpdatePoStatus(sb, args, actions);
      case "propose_send_po_to_vendor": return await proposeSendPoToVendor(sb, args, actions);
      default: return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function searchLeads(sb: ReturnType<typeof createClient>, args: Record<string, unknown>) {
  const q = String(args.query ?? "").trim();
  const stage = typeof args.stage === "string" ? args.stage : null;
  const limit = Math.min(Number(args.limit ?? 10) || 10, 25);
  let query = sb.from("leads")
    .select("id, name, phone, email, city, project_type, budget, timeline, stage, status, next_followup_date, created_at, details")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (stage) query = query.eq("stage", stage);
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%,details.ilike.%${q}%,email.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { error: error.message };
  return { count: data?.length ?? 0, leads: data ?? [] };
}

async function pipelineSummary(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb.from("leads")
    .select("stage, next_followup_date, created_at")
    .is("deleted_at", null);
  if (error) return { error: error.message };
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const byStage: Record<string, number> = {};
  let overdue = 0, addedThisWeek = 0;
  for (const r of (data ?? []) as Array<{ stage: string | null; next_followup_date: string | null; created_at: string }>) {
    const st = r.stage ?? "unassigned";
    byStage[st] = (byStage[st] ?? 0) + 1;
    if (r.next_followup_date && r.next_followup_date.slice(0, 10) <= today) overdue++;
    if (r.created_at >= weekAgo) addedThisWeek++;
  }
  return { total: data?.length ?? 0, by_stage: byStage, overdue_followups: overdue, added_last_7_days: addedThisWeek };
}

async function financeSummary(sb: ReturnType<typeof createClient>) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(); monthStart.setDate(1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);
  const { data: invoices, error: e1 } = await sb.from("invoices")
    .select("total_amount, paid_amount, status, due_date, issue_date")
    .is("deleted_at", null);
  if (e1) return { error: e1.message };
  const { data: pays, error: e2 } = await sb.from("payments")
    .select("amount, paid_on")
    .is("deleted_at", null)
    .gte("paid_on", monthStartIso);
  if (e2) return { error: e2.message };

  let pending = 0, overdueAmt = 0, oldestDays = 0;
  for (const i of (invoices ?? []) as Array<{ total_amount: number; paid_amount: number; status: string; due_date: string }>) {
    const out = Number(i.total_amount || 0) - Number(i.paid_amount || 0);
    if (out > 0 && i.status !== "draft") {
      pending += out;
      if (i.due_date && i.due_date < today) {
        overdueAmt += out;
        const days = Math.floor((Date.parse(today) - Date.parse(i.due_date)) / 86400_000);
        if (days > oldestDays) oldestDays = days;
      }
    }
  }
  const receivedThisMonth = (pays ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount || 0), 0);
  return {
    pending_total: pending,
    overdue_total: overdueAmt,
    oldest_overdue_days: oldestDays,
    received_this_month: receivedThisMonth,
    invoice_count: invoices?.length ?? 0,
  };
}

async function listOverdueFollowups(sb: ReturnType<typeof createClient>, args: Record<string, unknown>) {
  const limit = Math.min(Number(args.limit ?? 10) || 10, 25);
  const today = new Date().toISOString();
  const { data, error } = await sb.from("leads")
    .select("id, name, phone, city, stage, next_followup_date")
    .is("deleted_at", null)
    .not("next_followup_date", "is", null)
    .lte("next_followup_date", today)
    .order("next_followup_date", { ascending: true })
    .limit(limit);
  if (error) return { error: error.message };
  return { count: data?.length ?? 0, leads: data ?? [] };
}

async function findVendor(sb: ReturnType<typeof createClient>, args: Record<string, unknown>) {
  const q = String(args.query ?? "").trim();
  const category = typeof args.category === "string" ? args.category : null;
  let query = sb.from("vendors")
    .select("id, name, category, contact_person, phone, email, payment_terms, rating")
    .eq("active", true)
    .limit(15);
  if (category) query = query.eq("category", category);
  if (q) query = query.or(`name.ilike.%${q}%,contact_person.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { error: error.message };
  return { count: data?.length ?? 0, vendors: data ?? [] };
}

async function getQuotationStatus(sb: ReturnType<typeof createClient>, args: Record<string, unknown>) {
  const lead_name = typeof args.lead_name === "string" ? args.lead_name.trim() : "";
  const limit = Math.min(Number(args.limit ?? 10) || 10, 25);
  let query = sb.from("quotations")
    .select("id, quotation_number, customer_name, project_name, total_amount, status, workflow_status, sent_at, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (lead_name) query = query.ilike("customer_name", `%${lead_name}%`);
  const { data, error } = await query;
  if (error) return { error: error.message };
  return { count: data?.length ?? 0, quotations: data ?? [] };
}

// ---------- Action drafters (push to actions array, return summary for model) ----------

async function fetchLead(sb: ReturnType<typeof createClient>, leadId: string) {
  const { data, error } = await sb.from("leads")
    .select("id, name, phone, project_type, stage").eq("id", leadId).maybeSingle();
  if (error || !data) return null;
  return data as { id: string; name: string; phone: string | null; project_type: string | null; stage: string | null };
}

async function draftWhatsapp(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const leadId = String(args.lead_id ?? "");
  const intent = String(args.intent ?? "").trim();
  const lead = await fetchLead(sb, leadId);
  if (!lead) return { error: "Lead not found." };
  // Simple template — model already wrote the intent in plain English; we polish it.
  const greeting = `Hi ${lead.name?.split(" ")[0] ?? "there"},`;
  const body = intent.charAt(0).toUpperCase() + intent.slice(1);
  const sign = "\n\nThanks,\nChirpeel Interiors";
  const draft_text = `${greeting}\n\n${body}${sign}`;
  actions.push({
    kind: "whatsapp",
    lead_id: lead.id,
    lead_name: lead.name,
    lead_phone: lead.phone ?? undefined,
    draft_text,
  });
  return { ok: true, lead_name: lead.name, phone: lead.phone, preview: draft_text.slice(0, 120) };
}

async function draftFollowup(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const leadId = String(args.lead_id ?? "");
  const days = Math.max(0, Math.floor(Number(args.days_from_now ?? 1)));
  const note = String(args.note ?? "").trim();
  const lead = await fetchLead(sb, leadId);
  if (!lead) return { error: "Lead not found." };
  const d = new Date(); d.setDate(d.getDate() + days);
  actions.push({
    kind: "followup",
    lead_id: lead.id,
    lead_name: lead.name,
    days_from_now: days,
    date_iso: d.toISOString().slice(0, 10),
    draft_text: note,
  });
  return { ok: true, lead_name: lead.name, scheduled_for: d.toISOString().slice(0, 10) };
}

async function prepareQuotationLink(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const leadId = String(args.lead_id ?? "");
  const lead = await fetchLead(sb, leadId);
  if (!lead) return { error: "Lead not found." };
  actions.push({
    kind: "open_quotation",
    lead_id: lead.id,
    lead_name: lead.name,
    url: `/studio/quotation?lead=${lead.id}`,
  });
  return { ok: true, lead_name: lead.name };
}

async function prepareSiteVisit(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const leadId = String(args.lead_id ?? "");
  const date_iso = String(args.date_iso ?? "").slice(0, 10);
  const time_label = typeof args.time_label === "string" ? args.time_label : "";
  const lead = await fetchLead(sb, leadId);
  if (!lead) return { error: "Lead not found." };
  if (!date_iso || !/^\d{4}-\d{2}-\d{2}$/.test(date_iso)) return { error: "date_iso must be YYYY-MM-DD" };
  actions.push({
    kind: "site_visit",
    lead_id: lead.id,
    lead_name: lead.name,
    date_iso,
    time_label,
    draft_text: `Site visit ${time_label ? `at ${time_label}` : ""}`.trim(),
  });
  return { ok: true, lead_name: lead.name, date: date_iso, time: time_label };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// =============================================================================
// Write proposers — never mutate the DB. They build a confirm card payload.
// =============================================================================
const f = (label: string, value: unknown) =>
  value === undefined || value === null || value === "" ? null : { label, value: String(value) };
const fields = (...items: Array<{ label: string; value: string } | null>) =>
  items.filter(Boolean) as Array<{ label: string; value: string }>;

function proposeCreateLead(args: Record<string, unknown>, actions: Action[]) {
  const payload = {
    name: String(args.name ?? "").trim(),
    phone: String(args.phone ?? "").trim(),
    email: args.email ? String(args.email) : null,
    city: args.city ? String(args.city) : null,
    project_type: args.project_type ? String(args.project_type) : null,
    budget: args.budget ? String(args.budget) : null,
    timeline: args.timeline ? String(args.timeline) : null,
    details: args.details ? String(args.details) : null,
    source: args.source ? String(args.source) : "ai_assistant",
    assigned_to: args.assigned_to ? String(args.assigned_to) : null,
  };
  if (!payload.name || !payload.phone) return { error: "name and phone are required" };
  actions.push({
    kind: "create_lead",
    title: "Create lead",
    summary: `${payload.name} · ${payload.phone}`,
    fields: fields(
      f("Name", payload.name), f("Phone", payload.phone), f("City", payload.city),
      f("Project", payload.project_type), f("Budget", payload.budget),
      f("Timeline", payload.timeline), f("Source", payload.source),
      f("Assign to", payload.assigned_to), f("Notes", payload.details),
    ),
    payload,
  });
  return { ok: true, proposed: payload.name };
}

async function proposeUpdateLead(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const id = String(args.lead_id ?? "");
  if (!id) return { error: "lead_id required" };
  const lead = await fetchLead(sb, id);
  if (!lead) return { error: "Lead not found" };
  const editable = ["name","phone","email","city","pincode","project_type","budget","timeline","details","source","assigned_to","stage","status","next_followup_date"];
  const changes: Record<string, unknown> = {};
  for (const k of editable) if (args[k] !== undefined) changes[k] = args[k];
  if (Object.keys(changes).length === 0) return { error: "No fields to update" };
  actions.push({
    kind: "update_lead",
    title: `Update lead — ${lead.name}`,
    summary: Object.keys(changes).join(", "),
    fields: Object.entries(changes).map(([k, v]) => ({ label: k, value: String(v) })),
    payload: { id, changes },
    lead_id: id, lead_name: lead.name,
  });
  return { ok: true, lead_name: lead.name, fields_changed: Object.keys(changes) };
}

async function proposeDeleteLead(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const id = String(args.lead_id ?? "");
  const lead = await fetchLead(sb, id);
  if (!lead) return { error: "Lead not found" };
  actions.push({
    kind: "delete_lead",
    destructive: true,
    title: "Delete lead",
    summary: `${lead.name} · ${lead.phone ?? ""}`,
    fields: fields(f("Name", lead.name), f("Phone", lead.phone), f("Project", lead.project_type)),
    payload: { id },
    lead_id: id, lead_name: lead.name,
  });
  return { ok: true, lead_name: lead.name };
}

async function proposeUpdateBrandPrice(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const newRate = Number(args.new_rate_per_sqft);
  if (!isFinite(newRate) || newRate < 0) return { error: "new_rate_per_sqft must be a positive number" };
  let id = args.brand_id ? String(args.brand_id) : "";
  let name = args.brand_name ? String(args.brand_name) : "";
  let category = args.category ? String(args.category) : "";
  let oldRate: number | null = null;
  if (!id && name) {
    let q = sb.from("brand_catalog").select("id, name, category, rate_per_sqft").ilike("name", `%${name}%`).limit(2);
    if (category) q = q.eq("category", category);
    const { data } = await q;
    if (!data || data.length === 0) return { error: `No brand matched "${name}"` };
    if (data.length > 1) return { error: `Multiple brands matched "${name}" — narrow by category` };
    id = data[0].id as string; name = data[0].name as string; category = data[0].category as string; oldRate = Number(data[0].rate_per_sqft);
  } else if (id) {
    const { data } = await sb.from("brand_catalog").select("name, category, rate_per_sqft").eq("id", id).maybeSingle();
    if (!data) return { error: "Brand not found" };
    name = data.name as string; category = data.category as string; oldRate = Number(data.rate_per_sqft);
  } else return { error: "Provide brand_id or brand_name" };
  actions.push({
    kind: "update_brand_price",
    title: `Update brand rate — ${name}`,
    summary: `${category}: ₹${oldRate ?? "?"} → ₹${newRate}/sqft`,
    fields: fields(f("Brand", name), f("Category", category), f("Old rate", `₹${oldRate}/sqft`), f("New rate", `₹${newRate}/sqft`)),
    payload: { id, new_rate_per_sqft: newRate },
  });
  return { ok: true, brand: name, old: oldRate, new: newRate };
}

async function proposeUpdatePricingItem(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  let id = args.item_id ? String(args.item_id) : "";
  if (!id && args.item_name) {
    const { data } = await sb.from("pricing_catalog").select("id, name").ilike("name", `%${args.item_name}%`).limit(2);
    if (!data || data.length === 0) return { error: `No pricing item matched "${args.item_name}"` };
    if (data.length > 1) return { error: `Multiple items matched — pass item_id` };
    id = data[0].id as string;
  }
  if (!id) return { error: "item_id or item_name required" };
  const { data: row } = await sb.from("pricing_catalog").select("name, category, rate_per_sqft, fixed_cost, active").eq("id", id).maybeSingle();
  if (!row) return { error: "Pricing item not found" };
  const changes: Record<string, unknown> = {};
  if (args.new_rate_per_sqft !== undefined) changes.rate_per_sqft = Number(args.new_rate_per_sqft);
  if (args.new_fixed_cost !== undefined) changes.fixed_cost = Number(args.new_fixed_cost);
  if (args.active !== undefined) changes.active = Boolean(args.active);
  if (Object.keys(changes).length === 0) return { error: "No changes" };
  actions.push({
    kind: "update_pricing_item",
    title: `Update pricing — ${row.name}`,
    summary: Object.entries(changes).map(([k, v]) => `${k}: ${v}`).join(" · "),
    fields: fields(
      f("Item", row.name), f("Category", row.category),
      changes.rate_per_sqft !== undefined ? f("Rate/sqft", `₹${row.rate_per_sqft} → ₹${changes.rate_per_sqft}`) : null,
      changes.fixed_cost !== undefined ? f("Fixed cost", `₹${row.fixed_cost} → ₹${changes.fixed_cost}`) : null,
      changes.active !== undefined ? f("Active", String(changes.active)) : null,
    ),
    payload: { id, changes },
  });
  return { ok: true, item: row.name };
}

async function proposeCreateQuotation(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const lead = await fetchLead(sb, String(args.lead_id ?? ""));
  if (!lead) return { error: "Lead not found" };
  const rooms = Array.isArray(args.rooms) ? (args.rooms as unknown[]).map(String) : [];
  actions.push({
    kind: "create_quotation",
    title: `Create quotation — ${lead.name}`,
    summary: rooms.length ? `Rooms: ${rooms.join(", ")}` : "Open builder to configure",
    fields: fields(
      f("Lead", lead.name), f("Project", args.project_name ?? lead.project_type),
      rooms.length ? f("Rooms", rooms.join(", ")) : null,
      f("Notes", args.notes),
    ),
    payload: {
      lead_id: lead.id,
      project_name: args.project_name ?? null,
      rooms,
      notes: args.notes ?? null,
    },
    lead_id: lead.id, lead_name: lead.name,
    url: `/studio/quotation?lead=${lead.id}${args.project_name ? `&project=${encodeURIComponent(String(args.project_name))}` : ""}${rooms.length ? `&rooms=${encodeURIComponent(rooms.join(","))}` : ""}`,
  });
  return { ok: true, lead_name: lead.name };
}

async function proposeTransitionQuotation(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const id = String(args.quotation_id ?? "");
  const to = String(args.to_status ?? "");
  const { data } = await sb.from("quotations").select("quotation_number, customer_name, workflow_status, total_amount").eq("id", id).maybeSingle();
  if (!data) return { error: "Quotation not found" };
  actions.push({
    kind: "transition_quotation",
    title: `Move quotation → ${to}`,
    summary: `${data.quotation_number} · ${data.customer_name}`,
    fields: fields(
      f("Quotation", data.quotation_number), f("Customer", data.customer_name),
      f("From", data.workflow_status), f("To", to), f("Amount", `₹${data.total_amount}`),
      f("Note", args.note),
    ),
    payload: { quotation_id: id, to_status: to, note: args.note ?? null },
  });
  return { ok: true };
}

async function proposeSendQuotation(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const id = String(args.quotation_id ?? "");
  const channel = (String(args.channel ?? "whatsapp")).toLowerCase();
  const { data } = await sb.from("quotations").select("quotation_number, customer_name, customer_phone, customer_email, total_amount, workflow_status").eq("id", id).maybeSingle();
  if (!data) return { error: "Quotation not found" };
  actions.push({
    kind: "send_quotation",
    destructive: true,
    title: `Send quotation to client`,
    summary: `${data.quotation_number} → ${data.customer_name} via ${channel}`,
    fields: fields(
      f("Quotation", data.quotation_number), f("Customer", data.customer_name),
      f("Channel", channel),
      f("Contact", channel === "email" ? data.customer_email : data.customer_phone),
      f("Amount", `₹${data.total_amount}`),
      f("Workflow", data.workflow_status),
    ),
    payload: { quotation_id: id, channel },
  });
  return { ok: true };
}

async function proposeRecordPayment(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const amount = Number(args.amount);
  if (!isFinite(amount) || amount <= 0) return { error: "amount must be positive" };
  const lead_id = args.lead_id ? String(args.lead_id) : null;
  const invoice_id = args.invoice_id ? String(args.invoice_id) : null;
  if (!lead_id && !invoice_id) return { error: "Provide lead_id or invoice_id" };
  let leadName = "";
  if (lead_id) { const l = await fetchLead(sb, lead_id); if (l) leadName = l.name; }
  actions.push({
    kind: "record_payment",
    title: "Record payment",
    summary: `₹${amount.toLocaleString("en-IN")} ${leadName ? `from ${leadName}` : ""}`,
    fields: fields(
      f("Amount", `₹${amount.toLocaleString("en-IN")}`),
      f("Mode", args.mode ?? "upi"), f("Paid on", args.paid_on ?? "today"),
      leadName ? f("Lead", leadName) : null,
      f("Milestone", args.milestone), f("Reference", args.reference), f("Notes", args.notes),
    ),
    payload: {
      lead_id, invoice_id, amount,
      mode: String(args.mode ?? "upi"),
      paid_on: args.paid_on ? String(args.paid_on) : null,
      milestone: args.milestone ? String(args.milestone) : null,
      reference: args.reference ? String(args.reference) : null,
      notes: args.notes ? String(args.notes) : null,
    },
    lead_id: lead_id ?? undefined, lead_name: leadName,
  });
  return { ok: true, amount };
}

function proposeAddExpense(args: Record<string, unknown>, actions: Action[]) {
  const amount = Number(args.amount);
  if (!isFinite(amount) || amount <= 0) return { error: "amount must be positive" };
  const payload = {
    amount, category: String(args.category ?? "material"),
    vendor: args.vendor ? String(args.vendor) : null,
    description: args.description ? String(args.description) : null,
    payment_mode: args.payment_mode ? String(args.payment_mode) : "cash",
    expense_date: args.expense_date ? String(args.expense_date) : null,
    lead_id: args.lead_id ? String(args.lead_id) : null,
  };
  actions.push({
    kind: "add_expense",
    title: "Add expense",
    summary: `₹${amount.toLocaleString("en-IN")} · ${payload.category}`,
    fields: fields(
      f("Amount", `₹${amount.toLocaleString("en-IN")}`),
      f("Category", payload.category), f("Vendor", payload.vendor),
      f("Mode", payload.payment_mode), f("Date", payload.expense_date),
      f("Description", payload.description),
    ),
    payload,
  });
  return { ok: true };
}

async function proposeSendWhatsapp(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const lead = await fetchLead(sb, String(args.lead_id ?? ""));
  if (!lead) return { error: "Lead not found" };
  const body = String(args.body ?? "").trim();
  if (!body) return { error: "body required" };
  actions.push({
    kind: "send_whatsapp",
    destructive: true,
    title: `Send WhatsApp — ${lead.name}`,
    summary: lead.phone ?? "no phone",
    fields: fields(f("To", lead.name), f("Phone", lead.phone), f("Message", body.slice(0, 240))),
    payload: { lead_id: lead.id, body, template_key: args.template_key ?? null, phone: lead.phone },
    lead_id: lead.id, lead_name: lead.name, lead_phone: lead.phone ?? undefined,
    draft_text: body,
  });
  return { ok: true };
}

function proposeUpdateCompanySettings(args: Record<string, unknown>, actions: Action[]) {
  const allowed = ["company_name","tagline","phone","whatsapp","email","website","gstin","address_line1","address_line2","city","state","pincode","accent_color","header_color","default_terms","default_gst_rate","default_validity_days"];
  const changes: Record<string, unknown> = {};
  for (const k of allowed) if (args[k] !== undefined) changes[k] = args[k];
  if (Object.keys(changes).length === 0) return { error: "No fields to update" };
  actions.push({
    kind: "update_company_settings",
    title: "Update company settings",
    summary: Object.keys(changes).join(", "),
    fields: Object.entries(changes).map(([k, v]) => ({ label: k, value: String(v) })),
    payload: { changes },
  });
  return { ok: true, fields_changed: Object.keys(changes) };
}

// =============================================================================
// READ: team members, tasks, purchase orders
// =============================================================================
async function listTeamMembers(sb: ReturnType<typeof createClient>, args: Record<string, unknown>) {
  const q = String(args.query ?? "").trim();
  let query = sb.from("team_members").select("id, name, email, phone, role, active").eq("active", true).limit(25);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { error: error.message };
  return { count: data?.length ?? 0, members: data ?? [] };
}

async function listTasks(sb: ReturnType<typeof createClient>, args: Record<string, unknown>) {
  const status = String(args.status ?? "open");
  const limit = Math.min(Number(args.limit ?? 15) || 15, 30);
  let query = sb.from("tasks")
    .select("id, title, description, due_at, completed_at, assigned_to, priority, lead_id, project_id, created_at")
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (status === "open") query = query.is("completed_at", null);
  else if (status === "done") query = query.not("completed_at", "is", null);
  if (args.assigned_to) query = query.eq("assigned_to", String(args.assigned_to));
  if (args.lead_id) query = query.eq("lead_id", String(args.lead_id));
  const { data, error } = await query;
  if (error) return { error: error.message };
  return { count: data?.length ?? 0, tasks: data ?? [] };
}

async function listPurchaseOrders(sb: ReturnType<typeof createClient>, args: Record<string, unknown>) {
  const limit = Math.min(Number(args.limit ?? 15) || 15, 30);
  let query = sb.from("purchase_orders")
    .select("id, po_number, vendor_id, project_id, lead_id, po_date, amount, gst_amount, total_amount, status, description")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (args.status) query = query.eq("status", String(args.status));
  const { data, error } = await query;
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { count: 0, purchase_orders: [] };
  // attach vendor names
  const vendorIds = Array.from(new Set(data.map((p: any) => p.vendor_id).filter(Boolean)));
  const { data: vendors } = await sb.from("vendors").select("id, name, email, phone").in("id", vendorIds);
  const vmap = new Map((vendors ?? []).map((v: any) => [v.id, v]));
  let rows = data.map((p: any) => ({ ...p, vendor: vmap.get(p.vendor_id) ?? null }));
  if (args.vendor_query) {
    const vq = String(args.vendor_query).toLowerCase();
    rows = rows.filter((p: any) => p.vendor?.name?.toLowerCase().includes(vq));
  }
  return { count: rows.length, purchase_orders: rows };
}

// =============================================================================
// PROPOSE: tasks
// =============================================================================
async function resolveAssignee(sb: ReturnType<typeof createClient>, raw: string): Promise<string | null> {
  if (!raw) return null;
  const v = raw.trim();
  // Exact match first on name or email
  const { data } = await sb.from("team_members").select("name, email").eq("active", true).or(`name.ilike.${v},email.ilike.${v}`).limit(1);
  if (data && data.length) return (data[0] as any).name || (data[0] as any).email;
  // Fuzzy
  const { data: f } = await sb.from("team_members").select("name, email").eq("active", true).or(`name.ilike.%${v}%,email.ilike.%${v}%`).limit(2);
  if (f && f.length === 1) return (f[0] as any).name || (f[0] as any).email;
  return v; // fallback to raw — leave it for user to fix
}

async function proposeCreateTask(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const title = String(args.title ?? "").trim();
  if (!title) return { error: "title required" };
  const assignee = args.assigned_to ? await resolveAssignee(sb, String(args.assigned_to)) : null;
  let due_at: string | null = null;
  if (args.due_at) {
    const s = String(args.due_at);
    due_at = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T09:00:00.000Z` : s;
  }
  const priority = ["low","normal","high","urgent"].includes(String(args.priority ?? "")) ? String(args.priority) : "normal";
  const payload = {
    title, description: args.description ? String(args.description) : null,
    assigned_to: assignee, due_at, priority,
    lead_id: args.lead_id ? String(args.lead_id) : null,
    project_id: args.project_id ? String(args.project_id) : null,
  };
  actions.push({
    kind: "create_task",
    title: "Create task",
    summary: `${title}${assignee ? ` · ${assignee}` : ""}${due_at ? ` · due ${due_at.slice(0,10)}` : ""}`,
    fields: fields(
      f("Title", title), f("Assignee", assignee),
      f("Due", due_at?.slice(0,10)), f("Priority", priority),
      f("Description", payload.description),
    ),
    payload,
  });
  return { ok: true, title };
}

async function proposeAssignTask(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const id = String(args.task_id ?? "");
  const { data } = await sb.from("tasks").select("title, assigned_to").eq("id", id).maybeSingle();
  if (!data) return { error: "Task not found" };
  const assignee = await resolveAssignee(sb, String(args.assigned_to ?? ""));
  actions.push({
    kind: "assign_task",
    title: "Reassign task",
    summary: `${(data as any).title} → ${assignee}`,
    fields: fields(f("Task", (data as any).title), f("From", (data as any).assigned_to ?? "—"), f("To", assignee)),
    payload: { id, changes: { assigned_to: assignee } },
  });
  return { ok: true };
}

async function proposeCompleteTask(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const id = String(args.task_id ?? "");
  const { data } = await sb.from("tasks").select("title, assigned_to, completed_at").eq("id", id).maybeSingle();
  if (!data) return { error: "Task not found" };
  if ((data as any).completed_at) return { error: "Task already complete" };
  actions.push({
    kind: "complete_task",
    title: "Mark task complete",
    summary: (data as any).title,
    fields: fields(f("Task", (data as any).title), f("Assignee", (data as any).assigned_to)),
    payload: { id },
  });
  return { ok: true };
}

async function proposeRescheduleTask(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const id = String(args.task_id ?? "");
  const { data } = await sb.from("tasks").select("title, due_at").eq("id", id).maybeSingle();
  if (!data) return { error: "Task not found" };
  const s = String(args.due_at ?? "");
  const due_at = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T09:00:00.000Z` : s;
  actions.push({
    kind: "reschedule_task",
    title: "Reschedule task",
    summary: `${(data as any).title} → ${due_at.slice(0,10)}`,
    fields: fields(f("Task", (data as any).title), f("From", (data as any).due_at?.slice(0,10) ?? "—"), f("To", due_at.slice(0,10))),
    payload: { id, changes: { due_at } },
  });
  return { ok: true };
}

// =============================================================================
// PROPOSE: team invite
// =============================================================================
function proposeInviteTeamMember(_sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const email = String(args.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "valid email required" };
  const role = ["admin","manager","sales","designer","accounts"].includes(String(args.role ?? ""))
    ? String(args.role) : "sales";
  const payload = {
    email, name: args.name ? String(args.name) : null,
    phone: args.phone ? String(args.phone) : null, role,
  };
  actions.push({
    kind: "invite_team_member",
    destructive: true,
    title: "Invite team member",
    summary: `${payload.name ?? email} as ${role}`,
    fields: fields(
      f("Email", email), f("Name", payload.name),
      f("Role", role), f("Phone", payload.phone),
    ),
    payload,
  });
  return { ok: true, email, role };
}

// =============================================================================
// PROPOSE: purchase orders
// =============================================================================
async function proposeCreatePurchaseOrder(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const amount = Number(args.amount);
  if (!isFinite(amount) || amount <= 0) return { error: "amount must be positive" };
  let vendorId = args.vendor_id ? String(args.vendor_id) : "";
  let vendorName = "";
  if (!vendorId && args.vendor_name) {
    const { data } = await sb.from("vendors").select("id, name").ilike("name", `%${args.vendor_name}%`).eq("active", true).limit(2);
    if (!data || data.length === 0) return { error: `No vendor matched "${args.vendor_name}"` };
    if (data.length > 1) return { error: `Multiple vendors matched — narrow down` };
    vendorId = (data[0] as any).id; vendorName = (data[0] as any).name;
  } else if (vendorId) {
    const { data } = await sb.from("vendors").select("name").eq("id", vendorId).maybeSingle();
    if (data) vendorName = (data as any).name;
  } else return { error: "Provide vendor_id or vendor_name" };

  const gstRate = Number(args.gst_rate ?? 18);
  const gstAmount = +(amount * gstRate / 100).toFixed(2);
  const total = +(amount + gstAmount).toFixed(2);
  const payload = {
    vendor_id: vendorId,
    project_id: args.project_id ? String(args.project_id) : null,
    lead_id: args.lead_id ? String(args.lead_id) : null,
    po_date: args.po_date ? String(args.po_date) : new Date().toISOString().slice(0, 10),
    amount, gst_amount: gstAmount, total_amount: total,
    description: args.description ? String(args.description) : null,
    status: "draft",
  };
  actions.push({
    kind: "create_purchase_order",
    title: `Create PO — ${vendorName}`,
    summary: `₹${total.toLocaleString("en-IN")} to ${vendorName}`,
    fields: fields(
      f("Vendor", vendorName),
      f("Amount", `₹${amount.toLocaleString("en-IN")}`),
      f("GST", `${gstRate}% (₹${gstAmount.toLocaleString("en-IN")})`),
      f("Total", `₹${total.toLocaleString("en-IN")}`),
      f("Date", payload.po_date),
      f("Description", payload.description),
    ),
    payload,
  });
  return { ok: true, vendor: vendorName, total };
}

async function proposeUpdatePoStatus(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const id = String(args.purchase_order_id ?? "");
  const to = String(args.to_status ?? "");
  const allowed = ["draft","sent","acknowledged","received","cancelled"];
  if (!allowed.includes(to)) return { error: `to_status must be one of ${allowed.join(", ")}` };
  const { data } = await sb.from("purchase_orders").select("po_number, status, total_amount").eq("id", id).maybeSingle();
  if (!data) return { error: "PO not found" };
  const dest = to === "cancelled";
  actions.push({
    kind: "update_po_status",
    destructive: dest,
    title: `Move PO → ${to}`,
    summary: `${(data as any).po_number}: ${(data as any).status} → ${to}`,
    fields: fields(
      f("PO", (data as any).po_number),
      f("From", (data as any).status), f("To", to),
      f("Amount", `₹${(data as any).total_amount}`),
      f("Note", args.note),
    ),
    payload: { id, to_status: to, note: args.note ?? null, from_status: (data as any).status },
  });
  return { ok: true };
}

async function proposeSendPoToVendor(sb: ReturnType<typeof createClient>, args: Record<string, unknown>, actions: Action[]) {
  const id = String(args.purchase_order_id ?? "");
  const { data } = await sb.from("purchase_orders").select("po_number, vendor_id, total_amount").eq("id", id).maybeSingle();
  if (!data) return { error: "PO not found" };
  const { data: vendor } = await sb.from("vendors").select("name, email").eq("id", (data as any).vendor_id).maybeSingle();
  if (!vendor || !(vendor as any).email) return { error: "Vendor has no email on file" };
  actions.push({
    kind: "send_po_to_vendor",
    destructive: true,
    title: "Send PO to vendor",
    summary: `${(data as any).po_number} → ${(vendor as any).name}`,
    fields: fields(
      f("PO", (data as any).po_number),
      f("Vendor", (vendor as any).name),
      f("Email", (vendor as any).email),
      f("Total", `₹${(data as any).total_amount}`),
    ),
    payload: { purchase_order_id: id },
  });
  return { ok: true };
}