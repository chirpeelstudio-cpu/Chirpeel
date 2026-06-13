export type InboxTab = "Important" | "News" | "VIPs" | "All";

export const INBOX = [
  { id: "m1", initials: "KR", name: "Karthik R", count: 3, subject: "Pollachi villa — Phase 2", preview: "Karthik shared revised drawings and is asking for an updated quote by Friday. He wants to confirm the wardrobe shutter finish before Monday.", time: "2m", tag: "Important" as InboxTab },
  { id: "m2", initials: "MS", name: "Meera S.", count: null as number | null, subject: "Site visit — Tirupur duplex", preview: "Meera confirmed Tuesday 11am. Shared the floor plan PDF for review and asked for the BOQ template.", time: "18m", tag: "VIPs" as InboxTab },
  { id: "m3", initials: "PR", name: "Priya R., You", count: 4, subject: "Modular kitchen brief", preview: "Priya finalised the laminate brand and wants Hettich hardware throughout. Approved the island layout.", time: "1h", tag: "Important" as InboxTab },
  { id: "m4", initials: "JK", name: "Jai K.", count: 2, subject: "Coimbatore showroom", preview: "Jai added the BOQ for the false ceiling and asked about delivery timeline. Wants to lock vendors by Wednesday.", time: "2h", tag: "News" as InboxTab },
  { id: "m5", initials: "AV", name: "Anand V.", count: null, subject: "Erode bungalow — first meeting", preview: "Anand is shortlisting designers for a 4BHK. Budget is firm at ₹15L. Shared Pinterest references.", time: "5h", tag: "News" as InboxTab },
];

export const AUTOMATIONS = [
  { id: "a1", state: "running" as const, title: "Enrich new lead — Karthik R", time: "9:12 AM" },
  { id: "a2", state: "done" as const, title: "Send onboarding WhatsApp", time: "8:45 AM" },
  { id: "a3", state: "done" as const, title: "Sync quotation to Drive", time: "8:30 AM" },
  { id: "a4", state: "running" as const, title: "Auto-create BOQ from brief", time: "8:10 AM" },
  { id: "a5", state: "done" as const, title: "Notify designer on payment received", time: "Yesterday" },
  { id: "a6", state: "done" as const, title: "Auto-assign lead to designer based on budget", time: "2 hours ago" },
  { id: "a7", state: "running" as const, title: "Send WhatsApp nudge on unpaid invoice after 7 days", time: "Active" },
  { id: "a8", state: "done" as const, title: "Sync lead details to Google Contacts", time: "3 hours ago" },
  { id: "a9", state: "running" as const, title: "Create project folder & timeline on quotation sign-off", time: "Active" },
  { id: "a10", state: "done" as const, title: "Alert sales lead on stuck stage (> 5 days in negotiation)", time: "Yesterday" },
];

export const LEADS = [
  { name: "Karthik R", city: "Pollachi", budget: "₹18L", stage: "Negotiation" },
  { name: "Meera S.", city: "Tirupur", budget: "₹12L", stage: "Site visit" },
  { name: "Priya R.", city: "Coimbatore", budget: "₹22L", stage: "Negotiation" },
  { name: "Jai K.", city: "Coimbatore", budget: "₹9L", stage: "Quotation" },
  { name: "Anand V.", city: "Erode", budget: "₹15L", stage: "New" },
  { name: "Divya N.", city: "Tirupur", budget: "₹11L", stage: "New" },
];

export const QUOTATIONS = [
  { ref: "Q-1042", client: "Karthik R", amount: "₹18,40,000", status: "Sent" },
  { ref: "Q-1041", client: "Priya R.", amount: "₹22,10,000", status: "Approved" },
  { ref: "Q-1040", client: "Jai K.", amount: "₹9,80,000", status: "Draft" },
  { ref: "Q-1039", client: "Anand V.", amount: "₹15,30,000", status: "Sent" },
  { ref: "Q-1038", client: "Meera S.", amount: "₹12,60,000", status: "Approved" },
];

export const PROJECTS = [
  { name: "Pollachi villa", phase: "Carcass install", progress: 62 },
  { name: "Tirupur duplex", phase: "Site measurement", progress: 18 },
  { name: "Coimbatore showroom", phase: "False ceiling", progress: 84 },
  { name: "Erode bungalow", phase: "Design freeze", progress: 35 },
];

export const VENDORS = [
  { name: "Hettich", category: "Hardware" },
  { name: "Merino", category: "Laminates" },
  { name: "Greenply", category: "Plywood" },
  { name: "Hafele", category: "Fittings" },
  { name: "Asian Paints", category: "Finishes" },
  { name: "Kohler", category: "Sanitary" },
];

export const TASKS = [
  { id: "t1", title: "Send revised quote to Karthik", done: false },
  { id: "t2", title: "Confirm site visit — Meera (Tue 11am)", done: false },
  { id: "t3", title: "Order Hettich hinges for Priya kitchen", done: true },
  { id: "t4", title: "Upload BOQ for Coimbatore showroom", done: false },
  { id: "t5", title: "Share moodboard with Anand", done: false },
];

export const SKILLS = ["Draft quote", "Schedule visit", "Send WhatsApp", "Generate BOQ", "Find vendor"];

export const STATUS_COLOR: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  Approved: "bg-primary/15 text-primary",
  Negotiation: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  "Site visit": "bg-primary/15 text-primary",
  Quotation: "bg-accent text-accent-foreground",
  New: "bg-muted text-muted-foreground",
};

export const DEFAULT_LISTS = [
  { emoji: "📈", label: "Sales pipeline", target: "Leads", filter: "Negotiation" },
  { emoji: "🪑", label: "Active sites", target: "Projects", filter: null as string | null },
  { emoji: "🤝", label: "Vendor onboarding", target: "Vendors", filter: null as string | null },
];
