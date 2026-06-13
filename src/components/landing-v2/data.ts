export const REPLACES_LEADS = ["Excel", "Zoho", "HubSpot", "Pipedrive"];
export const REPLACES_QUOTES = ["Excel", "Canva", "Word", "Manual PDF"];
export const REPLACES_PROJECTS = ["Notion", "Trello", "Tally", "WhatsApp groups"];

export const SKILL_CATEGORIES = [
  "Featured", "Sales", "Site visits", "Quotations", "Vendors", "Client portal",
] as const;

export type SkillCategory = typeof SKILL_CATEGORIES[number];

export interface Skill {
  emoji: string;
  title: string;
  desc: string;
  connects: string[];
  cats: SkillCategory[];
}

export const SKILLS: Skill[] = [
  { emoji: "☀️", title: "Morning Briefing", desc: "Start your day with leads to call, site visits and follow-ups due.", connects: ["WhatsApp", "Gmail", "Calendar"], cats: ["Featured", "Sales"] },
  { emoji: "🔔", title: "Follow-up Finder", desc: "Surface leads gone cold and quotations awaiting client decision.", connects: ["WhatsApp", "Gmail"], cats: ["Featured", "Sales"] },
  { emoji: "📥", title: "Quotation Triage", desc: "Auto-route incoming quote requests to the right designer.", connects: ["Gmail", "WhatsApp"], cats: ["Quotations"] },
  { emoji: "📊", title: "Weekly Recap", desc: "Friday digest — leads won, quotations sent, projects shipped.", connects: ["Gmail", "Slack"], cats: ["Featured"] },
  { emoji: "📋", title: "Site-visit Prep", desc: "Brief on the client, last conversation and quotation history.", connects: ["Calendar", "Drive"], cats: ["Site visits", "Featured"] },
  { emoji: "🔬", title: "Lead Research", desc: "Enrich new leads with location, project type and budget hints.", connects: ["WhatsApp", "Justdial"], cats: ["Sales"] },
  { emoji: "✏️", title: "Quotation Drafter", desc: "Turn a brief into a draft BOQ with rooms, brands, GST.", connects: ["Drive"], cats: ["Quotations", "Featured"] },
  { emoji: "🤝", title: "Vendor PO Sync", desc: "Generate purchase orders from approved BOQs and email vendors.", connects: ["Gmail", "Tally"], cats: ["Vendors"] },
  { emoji: "💬", title: "Portal Updates", desc: "Auto-share milestone photos with the client portal.", connects: ["WhatsApp", "Drive"], cats: ["Client portal"] },
  { emoji: "💸", title: "Payment Reminders", desc: "Nudge clients on due milestones with branded WhatsApp.", connects: ["Razorpay", "WhatsApp"], cats: ["Featured", "Client portal"] },
];

export const INTEGRATIONS = [
  "WhatsApp", "Razorpay", "Gmail", "Drive", "Tally", "Zoho",
  "Slack", "Zoom", "Calendar", "Justdial", "IndiaMART", "Sketchup",
];

export const SCALE_CARDS = [
  { title: "Collaboration", desc: "Designers, PMs and site supervisors on one shared workspace." },
  { title: "Style", desc: "Brandable PDF themes, colors, and fonts to match your studio." },
  { title: "Speed", desc: "Keyboard-first, instant search across leads, quotes and projects." },
  { title: "Security", desc: "Row-level isolation per studio, encrypted at rest and in transit." },
  { title: "Mobile", desc: "Mobile web + Instagram-style bottom nav. iOS/Android coming." },
  { title: "Customization", desc: "Custom rooms, BOQ items, GST presets and pipeline stages." },
];

export const PLAYBOOKS = [
  {
    title: "Studio Sales Playbook",
    tag: "Sales · 16 pages · PDF · Pan-India",
    icon: "FileText",
    file: "/playbooks/chirpeel-sales-playbook.pdf",
    inside: [
      "Cold-call openers in 6 Indian languages",
      "WhatsApp follow-ups for Day 1, 3, 7, 14, 30",
      "7 Indian buyer objections + bridge lines",
      "3 closes that work across metros & tier-2",
    ],
  },
  {
    title: "Quotation Templates",
    tag: "Quotes · 12 sheets · Excel",
    icon: "Sheet",
    file: "/playbooks/chirpeel-quotation-templates.xlsx",
    inside: [
      "1BHK / 2BHK / 3BHK BOQ workbooks",
      "Modular kitchen, wardrobe, false ceiling",
      "Pre-locked: Hettich, Hafele, Greenply, Merino",
      "Auto GST 18% + discount calculator",
    ],
  },
  {
    title: "BOQ Library",
    tag: "Catalog · 127 items · CSV + Excel",
    icon: "BookOpen",
    file: "/playbooks/chirpeel-boq-library.xlsx",
    inside: [
      "Plywood, laminates, hardware (Tirupur 2026)",
      "False ceiling, lighting, electrical, paint",
      "Recommended brands per item",
      "Low–High rate band per unit",
    ],
  },
  {
    title: "Client Portal Tour",
    tag: "Portal · 6-page walkthrough · PDF",
    icon: "MonitorSmartphone",
    file: "/playbooks/chirpeel-portal-tour.pdf",
    inside: [
      "Login link + onboarding flow",
      "Milestone tracker + live photo gallery",
      "Payments, invoices, agreements",
      "The closing line that converts",
    ],
  },
] as const;