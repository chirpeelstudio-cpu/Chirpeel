import { LayoutDashboard, KanbanSquare, Users, FileText, Briefcase, Truck, Wallet, UserCog, Settings } from "lucide-react";
import type { AdminView } from "@/components/admin/AdminSidebar";
import type { Permissions } from "@/hooks/useCurrentUserPermissions";

export interface TourSubStep {
  /** data-tour-id of the in-page element to highlight. Falls back to the sidebar item if missing. */
  anchor: string;
  title: string;
  body: string;
  /** Short one-liner shown as a tooltip next to the highlight ring — "what it does · why it matters". */
  why?: string;
  tip?: string;
}

export interface TourStep {
  view: AdminView;
  perm: keyof Permissions;
  title: string;
  icon: typeof LayoutDashboard;
  intro: string;
  subSteps: TourSubStep[];
}

export const TOUR_STEPS: TourStep[] = [
  {
    view: "overview", perm: "overview", title: "Overview", icon: LayoutDashboard,
    intro: "Your daily command center — KPIs, follow-ups, and activity in one glance.",
    subSteps: [
      { anchor: "overview", title: "Overview module", body: "Start your day here. Pick a date range and see how the studio is performing.", why: "Your daily command center — open this first every morning.", tip: "Use the date range picker to compare this week vs last week." },
      { anchor: "overview-kpis", title: "Headline KPIs", body: "Leads, Quotations, Quoted Value, Collected, Profit and Conversion — all scoped to the selected range with deltas vs the previous period.", why: "One glance tells you if the studio is up or down vs last period." },
      { anchor: "overview-trend", title: "Lead trends", body: "12-month bars and 30-day line — quickly spot seasonality and dips so you can react.", why: "Spot dips early and time your marketing pushes." },
      { anchor: "overview-tasks", title: "My tasks", body: "Today's follow-ups and assigned tasks live here. Click a row to open the lead panel.", why: "Never miss a callback — your to-do list, auto-built from leads." },
      { anchor: "overview-activity", title: "Recent activity", body: "Every status change, payment and quote shows up here so the team stays in sync.", why: "A live audit feed so nothing falls through the cracks." },
    ],
  },
  {
    view: "pipeline", perm: "pipeline", title: "Pipeline", icon: KanbanSquare,
    intro: "An 8-stage Kanban board to move leads from first contact to won.",
    subSteps: [
      { anchor: "pipeline", title: "Pipeline module", body: "Drag cards across stages — Leads → Site Visit → Quote → Won. Overdue follow-ups are flagged in red.", why: "Visual pipeline = instant clarity on what stage every lead is in." },
      { anchor: "pipeline-filters", title: "Search & filter", body: "Filter by stage, source, or just the overdue ones. Search by name or phone for instant results.", why: "Cut to the leads that need you right now." },
      { anchor: "pipeline-board", title: "The Kanban board", body: "Each column is a stage. Drag a card from one column to another to move the lead. Drop targets light up as you drag.", why: "Updating stage is a one-second drag — no forms, no clicks." },
    ],
  },
  {
    view: "leads", perm: "leads", title: "Leads", icon: Users,
    intro: "The full leads table — search, filter, edit and convert.",
    subSteps: [
      { anchor: "leads", title: "Leads module", body: "All your leads in one searchable table. Inline-edit contact details and assignments.", why: "Your single source of truth for every enquiry, ever." },
      { anchor: "leads-search", title: "Search & export", body: "Search by name, phone, email or city. Export the filtered list to CSV anytime.", why: "Find any lead in seconds and share lists with your team." },
      { anchor: "leads-add", title: "Add a lead", body: "Capture a new walk-in or phone enquiry. The lead appears instantly on the pipeline too.", why: "Capture enquiries before you forget — under 30 seconds.", tip: "Add yourself as a test lead to try the workflow end-to-end." },
    ],
  },
  {
    view: "quotation", perm: "quotation", title: "Quotation", icon: FileText,
    intro: "Build branded, room-by-room quotes and send them in seconds.",
    subSteps: [
      { anchor: "quotation", title: "Quotation module", body: "Create, send and approve quotes. Filter by status to find drafts or sent quotes quickly.", why: "Faster, branded quotes win deals before competitors reply." },
      { anchor: "quot-add", title: "Create a quote", body: "Pick a customer, add rooms, choose brands (Hettich, Hafele, Greenply), apply GST and discount — done.", why: "Send a polished, GST-correct quote in under 5 minutes." },
      { anchor: "quot-filters", title: "Status tabs", body: "Switch between Draft / Sent / Approved / Rejected to focus on what needs attention.", why: "Chase only sent-but-not-approved quotes — no time wasted." },
    ],
  },
  {
    view: "projects", perm: "projects", title: "Projects", icon: Briefcase,
    intro: "Convert won quotes into projects with milestones, BOQ and tasks.",
    subSteps: [
      { anchor: "projects", title: "Projects module", body: "Track progress %, milestones, BOQ, materials, vendor POs and tasks for every active project.", why: "All execution data in one place — no more chasing WhatsApp updates." },
      { anchor: "projects-tabs", title: "Kanban or table", body: "Switch between a status Kanban (Planning → On-going → Completed) and a sortable table view.", why: "Pick the view that matches your thinking — visual or analytical." },
      { anchor: "projects-add", title: "Start a new project", body: "Won a quote? Spin it up as a project and assign a designer + supervisor right away.", why: "Move from sales to delivery in one click — no double entry." },
    ],
  },
  {
    view: "vendors", perm: "vendors", title: "Vendors", icon: Truck,
    intro: "Vendor directory plus Purchase Orders with a status timeline.",
    subSteps: [
      { anchor: "vendors", title: "Vendors module", body: "Save vendor contacts, payment terms and GSTIN. Raise POs and email them directly.", why: "One vendor list across all projects — no scattered contact cards." },
      { anchor: "vendors-tabs", title: "Directory & POs", body: "Switch between the vendor directory and Purchase Orders. POs track Draft → Sent → Delivered with timestamps.", why: "Know which POs are still pending delivery without calling vendors." },
    ],
  },
  {
    view: "finance", perm: "finance", title: "Finance", icon: Wallet,
    intro: "Invoices, payments, expenses, aging and cash flow — all in one module.",
    subSteps: [
      { anchor: "finance", title: "Finance module", body: "Auto-numbered GST invoices, payment reconciliation, expenses, aging and cash flow charts.", why: "Replace your accountant's spreadsheet with live, GST-ready numbers." },
      { anchor: "finance-tabs", title: "Tabs at a glance", body: "Overview, Payments, Invoices, Expenses, Aging and Cash Flow — pick a tab to drill in.", why: "Drill from a 30-second summary to invoice-level detail." },
    ],
  },
  {
    view: "team", perm: "team", title: "Team", icon: UserCog,
    intro: "Manage teammates, roles, working hours and performance.",
    subSteps: [
      { anchor: "team", title: "Team module", body: "Invite designers, sales, managers and installers. View performance and audit changes.", why: "Healthy competition + accountability without micromanaging." },
      { anchor: "team-tabs", title: "Leaderboard, Activity, Members & Hours", body: "Switch tabs to see who's converting most leads, the audit log, your team list, or your own working hours.", why: "See top performers and who changed what, instantly." },
    ],
  },
  {
    view: "settings", perm: "settings", title: "Settings", icon: Settings,
    intro: "Configure how the CRM works for your studio.",
    subSteps: [
      { anchor: "settings", title: "Settings module", body: "Company defaults, pricing, BOQ catalog, pipeline stages, numbering, GST presets and more.", why: "Tune the CRM to match exactly how your studio actually works." },
      { anchor: "settings-tabs", title: "Find what you need", body: "Tabs across the top group everything: Company, Defaults, Pricing, BOQ, Stages, Routing, Numbering, Notifications, Trash and About.", why: "Every knob you'll ever need lives behind one of these tabs." },
    ],
  },
];