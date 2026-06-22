import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Home, Inbox as InboxIcon, Users, Building2, ListChecks, FileText, Zap,
  Hammer, Sparkles, CheckCircle2, Circle, Reply, Check,
  Menu, LogOut, LayoutDashboard, BarChart3, Megaphone, Wallet, UserCog,
  Palette, Settings as SettingsIcon, MessageSquare, RefreshCw, UserPlus,
  Sliders, CreditCard, Info, GitBranch, Tags, UserCheck, Merge, Percent, Coins,
  BookOpen, Receipt, FolderClosed, Hash, Mail, CheckSquare, ShieldAlert, Bell, Trash2, Database, ChevronLeft, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  INBOX, AUTOMATIONS, InboxTab,
} from "@/components/studio/mockData";
import { AiAssistantPanel } from "@/components/admin/ai/AiAssistantPanel";
import { AdvancedAutomationPanel } from "@/components/studio/AdvancedAutomationPanel";
import chirpeelLogo from "@/assets/chirpeel-logo.png";
import { MobileBottomNav, type BottomNavKey } from "@/components/admin/shared/MobileBottomNav";

// === Real CRM modules (merged from AdminDashboard) ===
import OverviewDashboard from "@/components/admin/OverviewDashboard";
import type { AdminView } from "@/components/admin/AdminSidebar";
import CRMPipeline from "@/components/admin/CRMPipeline";
import LeadsTable from "@/components/admin/LeadsTable";
import LeadDetailPanel from "@/components/admin/LeadDetailPanel";
import CRMInsights from "@/components/admin/CRMInsights";
import AddLeadDialog from "@/components/admin/AddLeadDialog";
import FollowUpNotifications from "@/components/admin/FollowUpNotifications";
import { QuotationsList } from "@/components/admin/quotation/QuotationsList";
import CompanyBranding from "@/components/admin/CompanyBranding";
import MessageTemplates from "@/components/admin/MessageTemplates";
import MaterialPricingMatrix from "@/components/admin/settings/MaterialPricingMatrix";
import TeamModule from "@/components/admin/team/TeamModule";
import FinanceModule from "@/components/admin/finance/FinanceModule";
import VendorsModule from "@/components/admin/vendors/VendorsModule";
import ProjectsModule from "@/components/admin/projects/ProjectsModule";
import MarketingModule from "@/components/admin/marketing/MarketingModule";
import TasksPage from "@/components/admin/tasks/TasksPage";
import CompanyDefaultsPanel from "@/components/admin/settings/CompanyDefaultsPanel";
import PdfThemePanel from "@/components/admin/settings/PdfThemePanel";
import TrashPanel from "@/components/admin/settings/TrashPanel";
import BOQCatalogPanel from "@/components/admin/settings/BOQCatalogPanel";
import WorkflowPanel from "@/components/admin/settings/WorkflowPanel";
import AccessPanel from "@/components/admin/settings/AccessPanel";
import NotificationsPanel from "@/components/admin/settings/NotificationsPanel";
import DataExportPanel from "@/components/admin/settings/DataExportPanel";
import AboutPanel from "@/components/admin/settings/AboutPanel";
import LeadSourcesTagsPanel from "@/components/admin/settings/LeadSourcesTagsPanel";
import PipelineStagesPanel from "@/components/admin/settings/PipelineStagesPanel";
import LeadRoutingPanel from "@/components/admin/settings/LeadRoutingPanel";
import DeduplicationPanel from "@/components/admin/settings/DeduplicationPanel";
import DiscountCapsPanel from "@/components/admin/settings/DiscountCapsPanel";
import GstPresetsPanel from "@/components/admin/settings/GstPresetsPanel";
import NumberingFormatPanel from "@/components/admin/settings/NumberingFormatPanel";
import MilestoneTemplatesPanel from "@/components/admin/settings/MilestoneTemplatesPanel";
import ExpenseCategoriesPanel from "@/components/admin/settings/ExpenseCategoriesPanel";
import BillingPanel from "@/components/billing/BillingPanel";
import { useLeadNotifications } from "@/hooks/useLeadNotifications";
import { useLocalCache } from "@/hooks/useLocalCache";
import type { PipelineLead } from "@/components/admin/types";
import { useWelcomeTour } from "@/components/admin/onboarding/tourState";
import { SidebarSpotlightTour, type TourStep } from "@/components/admin/onboarding/SidebarSpotlightTour";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HelpWidget } from "@/components/admin/HelpWidget";
import UpgradeNudge from "@/components/billing/UpgradeNudge";
import UsageOverviewPanel from "@/components/billing/UsageOverviewPanel";

type NavKey =
  | "Home" | "Inbox"
  | "Overview" | "Pipeline" | "Leads" | "Quotations"
  | "Projects" | "Vendors" | "Finance"
  | "Marketing" | "Tasks" | "Automations"
  | "Team" | "Templates" | "Branding" | "Settings";

type NavItem = { icon: any; label: NavKey; slug: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { icon: Home, label: "Home", slug: "home" },
      { icon: InboxIcon, label: "Inbox", slug: "inbox" },
    ],
  },
  {
    label: "CRM",
    items: [
      { icon: LayoutDashboard, label: "Overview", slug: "overview" },
      { icon: BarChart3, label: "Pipeline", slug: "pipeline" },
      { icon: Users, label: "Leads", slug: "leads" },
      { icon: FileText, label: "Quotations", slug: "quotations" },
      { icon: Building2, label: "Projects", slug: "projects" },
      { icon: Hammer, label: "Vendors", slug: "vendors" },
      { icon: Wallet, label: "Finance", slug: "finance" },
    ],
  },
  {
    label: "Growth",
    items: [
      { icon: Megaphone, label: "Marketing", slug: "marketing" },
      { icon: ListChecks, label: "Tasks", slug: "tasks" },
      { icon: Zap, label: "Automations", slug: "automations" },
    ],
  },
  {
    label: "Team & Settings",
    items: [
      { icon: UserCog, label: "Team", slug: "team" },
      { icon: MessageSquare, label: "Templates", slug: "templates" },
      { icon: Palette, label: "Branding", slug: "branding" },
      { icon: SettingsIcon, label: "Settings", slug: "settings" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const slugToNav: Record<string, NavKey> = Object.fromEntries(
  ALL_ITEMS.map((i) => [i.slug, i.label])
) as Record<string, NavKey>;
const navToSlug: Record<NavKey, string> = Object.fromEntries(
  ALL_ITEMS.map((i) => [i.label, i.slug])
) as Record<NavKey, string>;

const SETTINGS_GROUPS = [
  {
    label: "Studio Profile",
    items: [
      { value: "company", label: "Company Profile", icon: Building2 },
      { value: "defaults", label: "Defaults", icon: Sliders },
      { value: "pdf-theme", label: "PDF Theme", icon: Palette },
      { value: "billing", label: "Billing", icon: CreditCard },
      { value: "about", label: "About", icon: Info },
    ]
  },
  {
    label: "Sales & CRM",
    items: [
      { value: "stages", label: "Pipeline Stages", icon: GitBranch },
      { value: "sources", label: "Sources & Tags", icon: Tags },
      { value: "routing", label: "Lead Routing", icon: UserCheck },
      { value: "dedup", label: "Deduplication", icon: Merge },
      { value: "discounts", label: "Discount Caps", icon: Percent },
    ]
  },
  {
    label: "Catalog & Pricing",
    items: [
      { value: "pricing", label: "Material Pricing", icon: Coins },
      { value: "boq", label: "BOQ Catalog", icon: BookOpen },
      { value: "gst", label: "GST Presets", icon: Receipt },
      { value: "expense-cats", label: "Expense Categories", icon: FolderClosed },
      { value: "numbering", label: "Numbering Format", icon: Hash },
    ]
  },
  {
    label: "Workflow & Security",
    items: [
      { value: "workflow", label: "Workflows", icon: Zap },
      { value: "templates", label: "Message Templates", icon: Mail },
      { value: "milestones", label: "Milestones", icon: CheckSquare },
      { value: "access", label: "Access Control", icon: ShieldAlert },
      { value: "notifications", label: "Notifications", icon: Bell },
    ]
  },
  {
    label: "System Data",
    items: [
      { value: "data", label: "Data Export", icon: Database },
      { value: "trash", label: "Trash Bin", icon: Trash2 },
    ]
  }
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", month: "long", day: "numeric",
  });
}

export default function StudioDashboard() {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const activeNav: NavKey = (section && slugToNav[section]) || "Home";

  const [userName, setUserName] = useState("there");
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [inboxTab, setInboxTab] = useState<InboxTab>("Important");
  const [selectedMsg, setSelectedMsg] = useState<string | null>("m1");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [automationsState, setAutomationsState] = useState(AUTOMATIONS);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Settings active tab state
  const [settingsTab, setSettingsTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") ?? "company";
    }
    return "company";
  });

  // Sync settingsTab with URL search params when mounting or when activeNav changes
  useEffect(() => {
    if (activeNav === "Settings" && typeof window !== "undefined") {
      const currentTab = new URLSearchParams(window.location.search).get("tab") ?? "company";
      if (currentTab !== settingsTab) {
        setSettingsTab(currentTab);
      }
    }
  }, [activeNav, settingsTab]);

  // Sidebar open/collapsed state (persisted)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chirpeel:sidebar-open");
      return stored !== "false"; // default to true
    }
    return true;
  });

  const handleSidebarToggle = (open: boolean) => {
    setSidebarOpen(open);
    if (typeof window !== "undefined") {
      localStorage.setItem("chirpeel:sidebar-open", String(open));
    }
  };

  // === CRM state lifted from AdminDashboard ===
  const { value: leads, setValue: setLeads, hydratedFromCache } =
    useLocalCache<PipelineLead[]>("leads.list", []);
  const [loading, setLoading] = useState(!hydratedFromCache);
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [quoteCounts, setQuoteCounts] = useState<Record<string, { total: number; sent: number }>>({});
  const [pendingQuotation, setPendingQuotation] = useState<{ leadId?: string; quotationId?: string } | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setLeads((data ?? []) as unknown as PipelineLead[]);
    setLoading(false);
  }, [setLeads]);

  const fetchQuoteCounts = useCallback(async () => {
    const { data } = await supabase
      .from("quotations")
      .select("lead_id, status")
      .is("deleted_at", null)
      .not("lead_id", "is", null);
    const map: Record<string, { total: number; sent: number }> = {};
    (data ?? []).forEach((row: { lead_id: string | null; status: string }) => {
      if (!row.lead_id) return;
      const entry = (map[row.lead_id] ||= { total: 0, sent: 0 });
      entry.total += 1;
      if (row.status === "sent" || row.status === "approved") entry.sent += 1;
    });
    setQuoteCounts(map);
  }, []);

  const handleNewLead = useCallback(() => {
    fetchLeads();
  }, [fetchLeads]);
  useLeadNotifications(handleNewLead);

  // Refresh leads immediately after the AI assistant (or any in-app action) writes.
  // This is the belt-and-braces partner to realtime — fires synchronously inside the same tab
  // so the pipeline updates the moment a confirm card turns green, even before realtime arrives.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ kind?: string }>).detail;
      if (!detail?.kind) { fetchLeads(); return; }
      if (["create_lead", "update_lead", "delete_lead", "record_payment"].includes(detail.kind)) {
        fetchLeads();
      }
    };
    window.addEventListener("chirpeel:data-changed", handler as EventListener);
    return () => window.removeEventListener("chirpeel:data-changed", handler as EventListener);
  }, [fetchLeads]);

  // First-run onboarding tour (auto-opens once per browser; replayable from Settings → About)
  const tour = useWelcomeTour(true);

  // Tour copy — chapter cards interleaved with sidebar spotlights and a few
  // app-wide spotlights (AI bar, usage panel, upgrade nudge, help, account).
  const tourSteps: TourStep[] = useMemo(() => [
    // ── Chapter 1: Home & AI ────────────────────────────────────────────
    { kind: "chapter", slug: "ch-home", label: "Start at Home", icon: Home, eyebrow: "Chapter 1 · Your day", route: "/studio/home",
      what: "Home is your daily snapshot — the AI assistant, today's automations, your inbox and a live plan-usage panel.",
      when: "Open this every morning before you start working." },
    { slug: "ai-assistant", label: "Ask Chirpeel AI", icon: Sparkles, eyebrow: "Home · AI bar", route: "/studio/home",
      what: "Type any natural-language request — \"draft a follow-up to Ravi\" or \"show overdue leads\" — and the AI runs CRM actions for you.",
      when: "When you want a shortcut instead of clicking through screens." },
    { slug: "home",  label: "Home",  icon: Home,      what: "Your daily snapshot with the Chirpeel AI assistant bar at the top.", when: "First thing each morning to see what needs your attention." },
    { slug: "inbox", label: "Inbox", icon: InboxIcon, what: "All client messages from WhatsApp, email and your website forms in one feed.", when: "When you want to reply without switching apps." },

    // ── Chapter 2: Daily workflow ───────────────────────────────────────
    { kind: "chapter", slug: "ch-daily", label: "Your daily workflow", icon: BarChart3, eyebrow: "Chapter 2 · Sell", route: "/studio/pipeline",
      what: "Move new leads through the pipeline, send quotations, and close deals — the bread and butter of your studio.",
      when: "Daily — this is where most of your time will be spent." },
    { slug: "overview",   label: "Overview",   icon: LayoutDashboard, what: "KPI dashboard — leads in, conversion %, revenue, response time.", when: "Weekly business review or showing investors numbers." },
    { slug: "pipeline",   label: "Pipeline",   icon: BarChart3,       what: "Drag-and-drop Kanban across 8 stages (New → Converted) with overdue follow-ups in red.", when: "Daily — to move leads forward and spot stuck deals." },
    { slug: "leads",      label: "Leads",      icon: Users,           what: "Sortable list of every enquiry with search, filter and bulk actions.", when: "Bulk edits, exporting a list, or finding one specific contact." },
    { slug: "quotations", label: "Quotations", icon: FileText,        what: "Build itemised BOQs from your pricing catalog and share branded PDFs that clients can approve online.", when: "After a site visit, to send a quote that closes." },

    // ── Chapter 3: Run projects ─────────────────────────────────────────
    { kind: "chapter", slug: "ch-run", label: "Run your projects", icon: Building2, eyebrow: "Chapter 3 · Deliver", route: "/studio/projects",
      what: "Once a quote is approved, projects, vendors and finance keep your execution honest.",
      when: "After a deal is won — track milestones, pay vendors, log invoices." },
    { slug: "projects", label: "Projects", icon: Building2, what: "Active job tracker — milestones, site photos, production status.", when: "Once a quote is signed and work moves to execution." },
    { slug: "vendors",  label: "Vendors",  icon: Hammer,    what: "Directory of suppliers, carpenters and contractors with their rates and balances.", when: "Issuing a purchase order or paying a contractor's bill." },
    { slug: "finance",  label: "Finance",  icon: Wallet,    what: "Invoices, payments received, expenses and vendor bills — your studio's books.", when: "Month-end reconciliation or chasing a pending payment." },

    // ── Chapter 4: Grow ─────────────────────────────────────────────────
    { kind: "chapter", slug: "ch-grow", label: "Grow your studio", icon: Megaphone, eyebrow: "Chapter 4 · Scale", route: "/studio/marketing",
      what: "Marketing analytics, automations and team roles let you scale beyond just yourself.",
      when: "Once you have repeatable lead flow and need to hire or automate." },
    { slug: "marketing",   label: "Marketing",   icon: Megaphone,     what: "Lead source analytics + campaign tracking (Google Ads, Meta, referrals).", when: "Reviewing ad spend ROI and which channels send real buyers." },
    { slug: "tasks",       label: "Tasks",       icon: ListChecks,    what: "Personal and team to-do board for non-lead work.", when: "Daily standup or assigning internal work to teammates." },
    { slug: "automations", label: "Automations", icon: Zap,           what: "Auto follow-up nudges, alerts on stuck leads, and AI suggestions.", when: "When you want repetitive work to happen for you." },
    { slug: "team",        label: "Team",        icon: UserCog,       what: "Add Sales, Designer or Accounts logins with the right permissions.", when: "Onboarding new staff or changing who can see finance." },

    // ── Chapter 5: Make it yours ────────────────────────────────────────
    { kind: "chapter", slug: "ch-mine", label: "Make it yours", icon: Palette, eyebrow: "Chapter 5 · Customise", route: "/studio/branding",
      what: "Templates, branding and settings make every PDF and message feel like your studio — not a generic CRM.",
      when: "Set this up once before sending your first quote." },
    { slug: "templates", label: "Templates", icon: MessageSquare, what: "Pre-written WhatsApp and email messages your team can send in one click.", when: "Keeping client communication on-brand and consistent." },
    { slug: "branding",  label: "Branding",  icon: Palette,       what: "Logo, colors and PDF theme used in every quote and invoice you send.", when: "Before sending your first quote — set this up once." },
    { slug: "settings",  label: "Settings",  icon: SettingsIcon,  what: "Pricing presets, pipeline stages, GST, numbering, and the Clear demo data button.", when: "Initial studio setup, then occasionally for tweaks." },

    // ── Chapter 6: Plan, support, account ───────────────────────────────
    { kind: "chapter", slug: "ch-plan", label: "Plan, support, account", icon: Sparkles, eyebrow: "Chapter 6 · You", route: "/studio/home",
      what: "Last stop — your plan, the help widget, and how to sign out. Then you're free to explore.",
      when: "Anytime you hit a limit, get stuck, or hand the device to a teammate." },
    { slug: "usage-panel",  label: "Plan & usage",   icon: BarChart3, eyebrow: "Home · Usage", route: "/studio/home",
      what: "Live counters for leads, quotations, projects and team members against your plan limits.",
      when: "Whenever you wonder \"am I close to my limit?\" — upgrade in one click." },
    { slug: "upgrade-nudge", label: "Upgrade options", icon: Sparkles, eyebrow: "Sidebar · Upgrade",
      what: "When you cross 70% of any plan limit this nudge appears with the cheapest plan that lifts the cap.",
      when: "Tap it to compare Pro vs Studio without leaving the dashboard." },
    { slug: "help-widget", label: "Help & replay tour", icon: MessageSquare, eyebrow: "Floating button",
      what: "FAQs, contact email and phone, plus a button to replay this welcome tour anytime.",
      when: "Whenever you forget where something lives — or want to walk a teammate through." },
    { slug: "account", label: "Account & sign out", icon: LogOut, eyebrow: "Sidebar · Footer",
      what: "Sign out cleanly, especially on shared devices. Demo mode badge appears here when sample data is loaded.",
      when: "End of day on a shared laptop, or when switching studios." },
  ], []);

  const handleTourStep = useCallback((step: TourStep) => {
    // Only open the mobile sidebar Sheet on actual mobile viewports — on
    // desktop the sidebar is always visible, so toggling the Sheet would
    // cause a flicker each step.
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen(true);
    }
    // Navigate the underlying screen so the tour also previews the section.
    // Chapter steps and special spotlights provide an explicit `route`;
    // sidebar spotlights default to `/studio/<slug>`.
    const path = step.route ?? `/studio/${step.slug}`;
    navigate(path);
  }, [navigate]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (email) {
        setUserEmail(email);
        const name = email.split("@")[0].split(/[._-]/)[0];
        setUserName(name.charAt(0).toUpperCase() + name.slice(1));
      }
    });
    fetchLeads();
  }, [fetchLeads]);

  const goTo = (nav: NavKey) => {
    navigate(`/studio/${navToSlug[nav]}`);
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleSelectLead = (lead: PipelineLead) => setSelectedLead(lead);
  const handleRefresh = () => {
    fetchLeads();
    fetchQuoteCounts();
    if (selectedLead) {
      supabase.from("leads").select("*").eq("id", selectedLead.id).single()
        .then(({ data }) => { if (data) setSelectedLead(data as unknown as PipelineLead); });
    }
  };

  const openQuotationForLead = useCallback(({ leadId, quotationId }: { leadId: string; quotationId?: string }) => {
    setPendingQuotation({ leadId, quotationId });
    setSelectedLead(null);
    navigate(`/studio/${navToSlug["Quotations"]}`);
  }, [navigate]);

  // Refresh quote counts on first load and whenever leads refresh.
  useEffect(() => { fetchQuoteCounts(); }, [fetchQuoteCounts]);

  const visibleInbox = useMemo(
    () =>
      INBOX.filter((m) => !dismissed.has(m.id)).filter((m) =>
        inboxTab === "All" ? true : m.tag === inboxTab
      ),
    [dismissed, inboxTab]
  );

  const toggleAutomation = (id: string) =>
    setAutomationsState((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, state: a.state === "done" ? "running" : "done" } : a
      )
    );

  const dismissMsg = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    if (selectedMsg === id) setSelectedMsg(null);
  };

  const isDemo = userEmail === "demostudio940133@web-library.net" || userEmail === "demo@chirpeel.test";

  const Sidebar = (
    <aside className="bg-muted/40 border-r border-border p-4 text-sm h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        <div className="flex items-center gap-2">
          <img src={chirpeelLogo} alt="Chirpeel" className="w-7 h-7 rounded-md object-contain" />
          <span className="font-semibold text-foreground font-display">Chirpeel</span>
        </div>
        <button
          type="button"
          onClick={() => handleSidebarToggle(false)}
          className="p-1 rounded-lg hover:bg-background/85 hover:text-foreground text-muted-foreground transition-all cursor-pointer hidden md:flex items-center justify-center border border-border/10 shadow-sm"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg bg-background border border-border text-muted-foreground hover:border-primary/40 transition-colors cursor-text">
        <Search className="w-4 h-4" />
        <span className="text-xs">Search</span>
      </div>

      <nav className="mt-4 flex-1 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((it) => {
                const active = activeNav === it.label;
                return (
                  <button
                    key={it.label}
                    type="button"
                    data-tour={it.slug}
                    onClick={() => goTo(it.label)}
                    className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
                      active
                        ? "bg-background shadow-sm text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    }`}
                  >
                    <it.icon className="w-4 h-4" />
                    <span>{it.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <div className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">Chats</div>
          <button
            type="button"
            onClick={() => goTo("Home")}
            className="w-full text-left mt-1 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-primary" /> Chirpeel AI
          </button>
        </div>
      </nav>

      <div className="pt-4 border-t border-border">
        <div data-tour="upgrade-nudge">
          <UpgradeNudge />
        </div>
        {isDemo && (
          <div className="mb-2 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-semibold inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Demo mode
          </div>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          data-tour="account"
          className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
        <Link
          to="/v2"
          className="block mt-1 px-2.5 py-1.5 text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          ← Back to homepage
        </Link>
      </div>
    </aside>
  );

  // ===== Render the active main pane =====
  const renderMain = () => {
    switch (activeNav) {
      case "Overview":
        return (
          <OverviewDashboard
            onNavigate={(v: AdminView) => {
              const map: Record<AdminView, NavKey> = {
                overview: "Overview", pipeline: "Pipeline", leads: "Leads",
                quotation: "Quotations", projects: "Projects", vendors: "Vendors",
                finance: "Finance", marketing: "Marketing", messages: "Templates",
                branding: "Branding", settings: "Settings", team: "Team",
              };
              const target = map[v] ?? "Overview";
              goTo(target);
            }}
          />
        );
      case "Pipeline":
        return (
          <Tabs defaultValue="pipeline" className="space-y-4">
            <div className="-mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto scrollbar-none">
              <TabsList className="inline-flex w-max sm:grid sm:w-full sm:max-w-md sm:grid-cols-3">
                <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                <TabsTrigger value="table">All Leads</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="pipeline">
              <CRMPipeline leads={leads} onRefresh={handleRefresh} onSelectLead={handleSelectLead} quoteCounts={quoteCounts} />
            </TabsContent>
            <TabsContent value="table">
              <LeadsTable leads={leads} loading={loading} onSelectLead={handleSelectLead} onRefresh={handleRefresh} onAddLead={() => setAddLeadOpen(true)} quoteCounts={quoteCounts} />
            </TabsContent>
            <TabsContent value="insights">
              <CRMInsights leads={leads} />
            </TabsContent>
          </Tabs>
        );
      case "Leads":
        return <LeadsTable leads={leads} loading={loading} onSelectLead={handleSelectLead} onRefresh={handleRefresh} onAddLead={() => setAddLeadOpen(true)} quoteCounts={quoteCounts} />;
      case "Quotations":
        return (
          <QuotationsList
            initialLeadId={pendingQuotation?.quotationId ? null : pendingQuotation?.leadId ?? null}
            initialQuotationId={pendingQuotation?.quotationId ?? null}
            onConsumedInitial={() => setPendingQuotation(null)}
          />
        );
      case "Projects":
        return <ProjectsModule />;
      case "Vendors":
        return <VendorsModule />;
      case "Finance":
        return <FinanceModule />;
      case "Marketing":
        return <MarketingModule />;
      case "Team":
        return <TeamModule />;
      case "Templates":
        return <MessageTemplates />;
      case "Branding":
        return <CompanyBranding />;
      case "Settings":
        return (
          <Tabs
            value={settingsTab}
            onValueChange={(v) => {
              setSettingsTab(v);
              if (typeof window === "undefined") return;
              const url = new URL(window.location.href);
              url.searchParams.set("tab", v);
              if (v !== "billing") url.hash = "";
              window.history.replaceState(null, "", url.toString());
            }}
            className="w-full flex flex-col md:flex-row gap-6 items-stretch h-full overflow-hidden"
          >
            {/* Mobile View selector */}
            <div className="md:hidden w-full shrink-0 space-y-1.5 px-1">
              <label htmlFor="mobile-settings-tab" className="text-xs font-semibold text-muted-foreground">Settings Category</label>
              <div className="relative">
                <select
                  id="mobile-settings-tab"
                  value={settingsTab}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSettingsTab(v);
                    if (typeof window === "undefined") return;
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", v);
                    if (v !== "billing") url.hash = "";
                    window.history.replaceState(null, "", url.toString());
                  }}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  {SETTINGS_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label} className="font-semibold text-xs text-muted-foreground bg-background">
                      {group.items.map((it) => (
                        <option key={it.value} value={it.value} className="font-normal text-sm text-foreground bg-background">
                          {it.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Desktop Sidebar Navigation */}
            <aside className="hidden md:flex flex-col w-64 shrink-0 pr-4 border-r border-border/50 h-full overflow-y-auto space-y-5 pb-12 scrollbar-none">
              {SETTINGS_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1.5">
                  <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    {group.label}
                  </h4>
                  <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-0.5 items-stretch">
                    {group.items.map((it) => {
                      const Icon = it.icon;
                      return (
                        <TabsTrigger
                          key={it.value}
                          value={it.value}
                          className="w-full justify-start gap-2.5 px-3 py-2 text-left rounded-lg text-sm text-muted-foreground hover:bg-background/60 hover:text-foreground transition-all cursor-pointer select-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold"
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{it.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              ))}
            </aside>

            {/* Content Panel */}
            <div className="flex-1 min-w-0 overflow-y-auto pb-12 h-full pr-1">
              <TabsContent value="company" className="mt-0 focus-visible:outline-none"><CompanyBranding /></TabsContent>
              <TabsContent value="defaults" className="mt-0 focus-visible:outline-none"><CompanyDefaultsPanel /></TabsContent>
              <TabsContent value="pdf-theme" className="mt-0 focus-visible:outline-none"><PdfThemePanel /></TabsContent>
              <TabsContent value="pricing" className="mt-0 focus-visible:outline-none"><MaterialPricingMatrix /></TabsContent>
              <TabsContent value="boq" className="mt-0 focus-visible:outline-none"><BOQCatalogPanel /></TabsContent>
              <TabsContent value="templates" className="mt-0 focus-visible:outline-none"><MessageTemplates /></TabsContent>
              <TabsContent value="workflow" className="mt-0 focus-visible:outline-none"><WorkflowPanel /></TabsContent>
              <TabsContent value="stages" className="mt-0 focus-visible:outline-none"><PipelineStagesPanel /></TabsContent>
              <TabsContent value="sources" className="mt-0 focus-visible:outline-none"><LeadSourcesTagsPanel /></TabsContent>
              <TabsContent value="routing" className="mt-0 focus-visible:outline-none"><LeadRoutingPanel /></TabsContent>
              <TabsContent value="dedup" className="mt-0 focus-visible:outline-none"><DeduplicationPanel /></TabsContent>
              <TabsContent value="discounts" className="mt-0 focus-visible:outline-none"><DiscountCapsPanel /></TabsContent>
              <TabsContent value="gst" className="mt-0 focus-visible:outline-none"><GstPresetsPanel /></TabsContent>
              <TabsContent value="numbering" className="mt-0 focus-visible:outline-none"><NumberingFormatPanel /></TabsContent>
              <TabsContent value="milestones" className="mt-0 focus-visible:outline-none"><MilestoneTemplatesPanel /></TabsContent>
              <TabsContent value="expense-cats" className="mt-0 focus-visible:outline-none"><ExpenseCategoriesPanel /></TabsContent>
              <TabsContent value="billing" className="mt-0 focus-visible:outline-none"><BillingPanel /></TabsContent>
              <TabsContent value="access" className="mt-0 focus-visible:outline-none"><AccessPanel /></TabsContent>
              <TabsContent value="notifications" className="mt-0 focus-visible:outline-none"><NotificationsPanel /></TabsContent>
              <TabsContent value="data" className="mt-0 focus-visible:outline-none"><DataExportPanel /></TabsContent>
              <TabsContent value="trash" className="mt-0 focus-visible:outline-none"><TrashPanel /></TabsContent>
              <TabsContent value="about" className="mt-0 focus-visible:outline-none"><AboutPanel /></TabsContent>
            </div>
          </Tabs>
        );
      case "Tasks":
        return <TasksPage />;
      case "Automations":
        return <AdvancedAutomationPanel />;
      case "Inbox":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <div className="rounded-2xl border border-border bg-background p-3 divide-y divide-border">
              {INBOX.filter((m) => !dismissed.has(m.id)).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMsg(m.id)}
                  className={`w-full text-left flex items-start gap-3 py-3 px-2 -mx-2 rounded cursor-pointer transition-colors ${
                    selectedMsg === m.id ? "bg-muted/40" : "hover:bg-muted/20"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{m.name}</div>
                    <div className="text-xs truncate text-muted-foreground">{m.subject}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">{m.time}</div>
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-background p-4 text-sm h-fit">
              {(() => {
                const m = INBOX.find((x) => x.id === selectedMsg);
                if (!m) return <div className="text-muted-foreground text-xs">Select a message</div>;
                return (
                  <>
                    <div className="font-semibold">{m.subject}</div>
                    <div className="text-xs text-muted-foreground mt-1">From {m.name}</div>
                    <div className="text-xs mt-3">{m.preview}</div>
                    <button className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold cursor-pointer">
                      <Reply className="w-3 h-3" /> Reply
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        );
      case "Home":
      default:
        return (
          <div className="space-y-3">
            {/* Real CRM AI assistant */}
            <div data-tour="ai-assistant">
              <AiAssistantPanel />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            {/* Automations */}
            <div className="rounded-2xl border border-border bg-background p-4 xl:col-span-5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-2 text-center">
                Automations
              </div>
              {automationsState.slice(0, 3).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAutomation(a.id)}
                  className="w-full flex items-center justify-between py-2 text-sm hover:bg-muted/30 rounded px-2 -mx-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {a.state === "done" ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                      <Circle className="w-4 h-4 text-amber-500 fill-amber-500/30" />
                    )}
                    <span>{a.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{a.time}</span>
                </button>
              ))}
            </div>

            {/* Inbox preview */}
            <div className="rounded-2xl border border-border bg-background p-4 xl:col-span-7">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">Inbox</div>
                <div className="flex items-center gap-1 text-xs">
                  {(["Important", "News", "VIPs", "All"] as InboxTab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setInboxTab(t)}
                      className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                        inboxTab === t
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-border">
                {visibleInbox.length === 0 && (
                  <div className="py-6 text-center text-xs text-muted-foreground">Inbox zero ✨</div>
                )}
                {visibleInbox.map((m) => {
                  const isOpen = selectedMsg === m.id;
                  return (
                    <div key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedMsg(isOpen ? null : m.id)}
                        className={`w-full text-left flex items-start gap-3 py-2.5 px-2 -mx-2 rounded transition-colors cursor-pointer ${
                          isOpen ? "bg-muted/40" : "hover:bg-muted/20"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                          {m.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <span>{m.name}</span>
                            {m.count && (
                              <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5">{m.count}</span>
                            )}
                          </div>
                          <div className="text-xs truncate">
                            <span className="font-semibold">{m.subject}</span>{" "}
                            <span className="text-muted-foreground">{m.preview}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground shrink-0">{m.time}</div>
                      </button>
                      {isOpen && (
                        <div className="ml-11 mb-2 mr-2 rounded-lg bg-muted/30 p-3 text-xs">
                          <div className="text-foreground">{m.preview}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 cursor-pointer">
                              <Reply className="w-3 h-3" /> Reply
                            </button>
                            <button
                              onClick={() => dismissMsg(m.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border text-xs font-semibold hover:bg-background cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Mark done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            </div>

            {/* Plan & usage snapshot */}
            <div data-tour="usage-panel">
              <UsageOverviewPanel />
            </div>
          </div>
        );
    }
  };

  const isHome = activeNav === "Home";

  return (
    <>
      <Helmet>
        <title>Studio — Chirpeel</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="h-screen w-screen grid grid-cols-1 md:grid-cols-[auto_1fr] bg-background overflow-hidden">
        {/* Desktop sidebar */}
        <div className={`hidden md:block h-screen overflow-hidden transition-all duration-300 ease-in-out ${sidebarOpen ? "w-[260px]" : "w-0"}`}>
          <div className="w-[260px] h-full">
            {Sidebar}
          </div>
        </div>

        {/* Main column */}
        <div className="flex flex-col h-screen overflow-hidden min-w-0">
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between gap-2 p-3 border-b border-border bg-background shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button className="p-2 -ml-2"><Menu className="w-5 h-5" /></button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">{Sidebar}</SheetContent>
              </Sheet>
              <img src={chirpeelLogo} alt="Chirpeel" className="w-7 h-7 rounded-md object-contain shrink-0" />
              <span className="font-display font-semibold truncate">Chirpeel</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <FollowUpNotifications leads={leads} onSelectLead={handleSelectLead} onRefresh={handleRefresh} />
              <Button size="icon" className="h-9 w-9" onClick={() => setAddLeadOpen(true)} aria-label="Add Lead">
                <UserPlus className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchLeads} disabled={loading} aria-label="Refresh">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Sticky header */}
          <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border shrink-0">
            <div className="px-5 sm:px-8 py-4 flex items-start sm:items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                {!sidebarOpen && (
                  <button
                    type="button"
                    onClick={() => handleSidebarToggle(true)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer hidden md:flex items-center justify-center border border-border shadow-sm"
                    title="Expand Sidebar"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold font-display truncate">
                    {isHome ? `${getGreeting()}, ${userName}` : activeNav}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate()} · Tirupur, TN · 32°C
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <FollowUpNotifications leads={leads} onSelectLead={handleSelectLead} onRefresh={handleRefresh} />
                  <AddLeadDialog onLeadAdded={fetchLeads} open={addLeadOpen} onOpenChange={setAddLeadOpen} hideTrigger />
                  <Button size="sm" className="gap-1.5" onClick={() => setAddLeadOpen(true)}>
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Lead</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 sm:mr-1.5 ${loading ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
              </div>
            </div>
          </header>

          {/* Scrollable content */}
          <main className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeNav}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <ErrorBoundary scope={activeNav}>{renderMain()}</ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Global lead detail panel */}
        <LeadDetailPanel
          lead={selectedLead}
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onRefresh={handleRefresh}
          onOpenQuotation={({ leadId, quotationId }) => openQuotationForLead({ leadId, quotationId })}
        />
      </div>
      <MobileBottomNav
        activeKey={activeNav}
        onNavigate={(k: BottomNavKey) => goTo(k)}
        onAddLead={() => setAddLeadOpen(true)}
      />
      <HelpWidget />
      <SidebarSpotlightTour
        open={tour.open}
        steps={tourSteps}
        onStepEnter={handleTourStep}
        onClose={() => { tour.setOpen(false); setMobileOpen(false); }}
      />
    </>
  );
}
