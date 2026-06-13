import { useState, useMemo, KeyboardEvent } from "react";
import {
  Search, Home, Inbox, Users, Building2, ListChecks, FileText, Zap,
  Hammer, Mic, Plus, Sparkles, CheckCircle2, Circle, Reply, Check, X,
  LayoutDashboard, BarChart3, Wallet, Megaphone, UserCog, MessageSquare,
  Palette, Settings as SettingsIcon, TrendingUp, IndianRupee,
} from "lucide-react";
import logo from "@/assets/chirpeel-logo.png";

type NavKey =
  | "Home" | "Inbox"
  | "Overview" | "Pipeline" | "Leads" | "Quotations"
  | "Projects" | "Vendors" | "Finance"
  | "Marketing" | "Tasks" | "Automations"
  | "Team" | "Templates" | "Branding" | "Settings";

type NavItem = { icon: any; label: NavKey };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { icon: Home, label: "Home" },
      { icon: Inbox, label: "Inbox" },
    ],
  },
  {
    label: "CRM",
    items: [
      { icon: LayoutDashboard, label: "Overview" },
      { icon: BarChart3, label: "Pipeline" },
      { icon: Users, label: "Leads" },
      { icon: FileText, label: "Quotations" },
      { icon: Building2, label: "Projects" },
      { icon: Hammer, label: "Vendors" },
      { icon: Wallet, label: "Finance" },
    ],
  },
  {
    label: "Growth",
    items: [
      { icon: Megaphone, label: "Marketing" },
      { icon: ListChecks, label: "Tasks" },
      { icon: Zap, label: "Automations" },
    ],
  },
  {
    label: "Team & Settings",
    items: [
      { icon: UserCog, label: "Team" },
      { icon: MessageSquare, label: "Templates" },
      { icon: Palette, label: "Branding" },
      { icon: SettingsIcon, label: "Settings" },
    ],
  },
];

const DEFAULT_LISTS = [
  { emoji: "📈", label: "Sales pipeline", target: "Leads" as NavKey, filter: "Negotiation" },
  { emoji: "🪑", label: "Active sites", target: "Projects" as NavKey, filter: null },
  { emoji: "🤝", label: "Vendor onboarding", target: "Vendors" as NavKey, filter: null },
];

const INITIAL_AUTOMATIONS = [
  { id: "a1", state: "running" as const, title: "Enrich new lead — Karthik R", time: "9:12 AM" },
  { id: "a2", state: "done" as const, title: "Send onboarding WhatsApp", time: "8:45 AM" },
  { id: "a3", state: "done" as const, title: "Sync quotation to Drive", time: "8:30 AM" },
  { id: "a4", state: "running" as const, title: "Auto-create BOQ from brief", time: "8:10 AM" },
];

type InboxTab = "Important" | "News" | "VIPs" | "All";

const INITIAL_INBOX = [
  { id: "m1", initials: "KR", name: "Karthik R", count: 3, subject: "Pollachi villa — Phase 2", preview: "Karthik shared revised drawings and is asking for an updated quote by Friday", time: "2m", tag: "Important" as InboxTab },
  { id: "m2", initials: "MS", name: "Meera S.", count: null as number | null, subject: "Site visit — Bengaluru duplex", preview: "Meera confirmed Tuesday 11am. Shared the floor plan PDF for review.", time: "18m", tag: "VIPs" as InboxTab },
  { id: "m3", initials: "PR", name: "Priya R., You", count: 4, subject: "Modular kitchen brief", preview: "Priya finalised the laminate brand and wants Hettich hardware throughout.", time: "1h", tag: "Important" as InboxTab },
  { id: "m4", initials: "JK", name: "Jai K.", count: 2, subject: "Mumbai showroom", preview: "Jai added the BOQ for the false ceiling and asked about delivery timeline.", time: "2h", tag: "News" as InboxTab },
];

const LEADS = [
  { name: "Karthik R", city: "Pollachi", budget: "₹18L", stage: "Negotiation" },
  { name: "Meera S.", city: "Bengaluru", budget: "₹12L", stage: "Site visit" },
  { name: "Priya R.", city: "Mumbai", budget: "₹22L", stage: "Negotiation" },
  { name: "Jai K.", city: "Hyderabad", budget: "₹9L", stage: "Quotation" },
  { name: "Anand V.", city: "Pune", budget: "₹15L", stage: "New" },
];

const QUOTATIONS = [
  { ref: "Q-1042", client: "Karthik R", amount: "₹18,40,000", status: "Sent" },
  { ref: "Q-1041", client: "Priya R.", amount: "₹22,10,000", status: "Approved" },
  { ref: "Q-1040", client: "Jai K.", amount: "₹9,80,000", status: "Draft" },
  { ref: "Q-1039", client: "Anand V.", amount: "₹15,30,000", status: "Sent" },
];

const PROJECTS = [
  { name: "Pollachi villa", phase: "Carcass install", progress: 62 },
  { name: "Bengaluru duplex", phase: "Site measurement", progress: 18 },
  { name: "Mumbai showroom", phase: "False ceiling", progress: 84 },
];

const VENDORS = [
  { name: "Hettich", category: "Hardware" },
  { name: "Merino", category: "Laminates" },
  { name: "Greenply", category: "Plywood" },
  { name: "Hafele", category: "Fittings" },
];

const INITIAL_TASKS = [
  { id: "t1", title: "Send revised quote to Karthik", done: false },
  { id: "t2", title: "Confirm site visit — Meera (Tue 11am)", done: false },
  { id: "t3", title: "Order Hettich hinges for Priya kitchen", done: true },
  { id: "t4", title: "Upload BOQ for Mumbai showroom", done: false },
];

const SKILLS = ["Draft quote", "Schedule visit", "Send WhatsApp", "Generate BOQ"];

const STATUS_COLOR: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  Approved: "bg-primary/15 text-primary",
  Negotiation: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  "Site visit": "bg-primary/15 text-primary",
  Quotation: "bg-accent text-accent-foreground",
  New: "bg-muted text-muted-foreground",
};

// ---- New module preview data ----
const KPIS = [
  { label: "Leads this week", value: "27", delta: "+18%" },
  { label: "Quotations sent", value: "14", delta: "+9%" },
  { label: "Revenue MTD", value: "₹38.4L", delta: "+22%" },
  { label: "Active projects", value: "9", delta: "+2" },
];

const PIPELINE_COLS: { stage: string; leads: { name: string; budget: string }[] }[] = [
  { stage: "New", leads: [{ name: "Anand V.", budget: "₹15L" }, { name: "Divya P.", budget: "₹8L" }] },
  { stage: "Site visit", leads: [{ name: "Meera S.", budget: "₹12L" }] },
  { stage: "Quotation", leads: [{ name: "Jai K.", budget: "₹9L" }, { name: "Suresh M.", budget: "₹14L" }] },
  { stage: "Negotiation", leads: [{ name: "Karthik R", budget: "₹18L" }, { name: "Priya R.", budget: "₹22L" }] },
];

const FINANCE_KPIS = [
  { label: "Outstanding", value: "₹6.4L" },
  { label: "Received MTD", value: "₹12.8L" },
  { label: "Expenses", value: "₹3.1L" },
];
const FINANCE_INVOICES = [
  { ref: "INV-228", client: "Karthik R", amount: "₹3,20,000", status: "Paid" },
  { ref: "INV-227", client: "Priya R.", amount: "₹4,50,000", status: "Pending" },
  { ref: "INV-226", client: "Jai K.", amount: "₹1,95,000", status: "Paid" },
];

const MARKETING_CHANNELS = [
  { name: "Google Ads", spend: "₹42,000", leads: 38, cpl: "₹1,105" },
  { name: "Meta Ads", spend: "₹28,000", leads: 24, cpl: "₹1,166" },
];

const TEAM = [
  { name: "Priya R.", role: "Founder", initials: "PR", deals: 8 },
  { name: "Arjun N.", role: "Designer", initials: "AN", deals: 5 },
  { name: "Divya M.", role: "Sales", initials: "DM", deals: 7 },
  { name: "Karan S.", role: "Site lead", initials: "KS", deals: 3 },
];

const TEMPLATES = [
  { name: "WhatsApp follow-up", channel: "WhatsApp", desc: "Nudge cold leads after 3 days" },
  { name: "Quotation cover", channel: "Email", desc: "Branded quote intro with payment link" },
  { name: "Site-visit reminder", channel: "SMS", desc: "Confirm visit 24h before" },
];

const SETTINGS_GROUPS: { title: string; items: string[] }[] = [
  { title: "Company", items: ["Company defaults", "GST presets", "Numbering format"] },
  { title: "Pipeline", items: ["Pipeline stages", "Lead routing", "Deduplication"] },
  { title: "Catalog", items: ["BOQ catalog", "Material pricing", "Discount caps"] },
];

export default function AppMockup() {
  const [activeNav, setActiveNav] = useState<NavKey>("Home");
  const [inboxTab, setInboxTab] = useState<InboxTab>("Important");
  const [selectedMsg, setSelectedMsg] = useState<string | null>("m1");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [automations, setAutomations] = useState(INITIAL_AUTOMATIONS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [aiQuery, setAiQuery] = useState("");
  const [aiSubmitted, setAiSubmitted] = useState<string | null>(null);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [lists, setLists] = useState(DEFAULT_LISTS);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [leadFilter, setLeadFilter] = useState<string | null>(null);

  const visibleInbox = useMemo(
    () =>
      INITIAL_INBOX.filter((m) => !dismissed.has(m.id)).filter((m) =>
        inboxTab === "All" ? true : m.tag === inboxTab
      ),
    [dismissed, inboxTab]
  );

  const filteredLeads = leadFilter
    ? LEADS.filter((l) => l.stage === leadFilter)
    : LEADS;

  const toggleAutomation = (id: string) =>
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, state: a.state === "done" ? "running" : "done" } : a
      )
    );

  const dismissMsg = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    if (selectedMsg === id) setSelectedMsg(null);
  };

  const handleAiSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && aiQuery.trim()) {
      setAiSubmitted(aiQuery.trim());
    }
  };

  const goTo = (nav: NavKey, filter: string | null = null) => {
    setActiveNav(nav);
    if (nav === "Leads") setLeadFilter(filter);
  };

  return (
    <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-foreground/10 bg-background/95 backdrop-blur-sm">
      <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[220px_1fr] min-h-[560px]">
        {/* Sidebar */}
        <aside className="bg-muted/40 border-r border-border p-1.5 sm:p-3 text-[12px] overflow-y-auto max-h-[640px]">
          <button
            type="button"
            onClick={() => goTo("Home")}
            className="w-full flex items-center justify-center sm:justify-start gap-2 px-1 sm:px-2 py-2 rounded-lg hover:bg-background/70 transition-colors cursor-pointer"
          >
            <img src={logo} alt="Chirpeel" className="w-6 h-6 rounded-md object-contain" />
            <span className="font-semibold text-foreground hidden sm:inline">Chirpeel</span>
          </button>
          <div className="flex items-center justify-center sm:justify-start gap-2 px-1 sm:px-2 py-1.5 mt-2 rounded-lg bg-background border border-border text-muted-foreground hover:border-primary/40 transition-colors cursor-text">
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Search</span>
          </div>

          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mt-3">
              <div className="px-1 sm:px-2 text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1 hidden sm:block">
                {group.label}
              </div>
              <nav className="space-y-0.5">
                {group.items.map((it) => {
                  const active = activeNav === it.label;
                  return (
                    <button
                      type="button"
                      key={it.label}
                      onClick={() => goTo(it.label)}
                      title={it.label}
                      className={`w-full text-left flex items-center justify-center sm:justify-start gap-2 px-1 sm:px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        active
                          ? "bg-background shadow-sm text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                      }`}
                    >
                      <it.icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{it.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}

          <div className="mt-4 px-1 sm:px-2 text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center justify-center sm:justify-between">
            <span className="hidden sm:inline">Lists</span>
            <button
              type="button"
              onClick={() => setAddingList((v) => !v)}
              className="hover:text-foreground transition-colors cursor-pointer"
              aria-label="Add list"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {addingList && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newListName.trim()) {
                  setLists((prev) => [
                    ...prev,
                    { emoji: "✨", label: newListName.trim(), target: "Leads" as NavKey, filter: null },
                  ]);
                  setNewListName("");
                  setAddingList(false);
                }
              }}
              className="mt-1 px-2 hidden sm:block"
            >
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New list…"
                className="w-full text-[11px] px-2 py-1 rounded border border-border bg-background outline-none focus:border-primary"
              />
            </form>
          )}
          <div className="mt-1 space-y-0.5">
            {lists.map((l) => (
              <button
                type="button"
                key={l.label}
                onClick={() => goTo(l.target, l.filter)}
                title={l.label}
                className="w-full text-left flex items-center justify-center sm:justify-start gap-2 px-1 sm:px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors cursor-pointer"
              >
                <span>{l.emoji}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 px-2 text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold hidden sm:block">Chats</div>
          <button
            type="button"
            onClick={() => goTo("Home")}
            title="Chirpeel AI"
            className="w-full text-left mt-1 px-1 sm:px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors flex items-center justify-center sm:justify-start gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Chirpeel AI</span>
          </button>
        </aside>

        {/* Main pane */}
        <main className="p-3 sm:p-5 bg-background/60 overflow-hidden min-w-0 relative">
          <div>
            <h3 className="text-xl font-bold font-display">
              {activeNav === "Home" ? "Good morning, Priya" : activeNav}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Thursday, March 6 · Bengaluru · 26°C
            </p>
          </div>

          {activeNav === "Home" && (
            <>
              {/* AI search */}
              <div className="mt-4 rounded-2xl border border-border bg-background p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <input
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={handleAiSubmit}
                    placeholder="Ask Chirpeel AI anything…"
                    className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
                  />
                  <Mic className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground relative">
                  <Plus className="w-3 h-3" />
                  <button
                    type="button"
                    onClick={() => setSkillsOpen((v) => !v)}
                    className="px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-semibold hover:opacity-80 cursor-pointer"
                  >
                    Skills
                  </button>
                  {skillsOpen && (
                    <div className="absolute top-full left-12 mt-1 z-10 rounded-lg border border-border bg-background shadow-lg p-1 min-w-[140px]">
                      {SKILLS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setAiQuery(s);
                            setAiSubmitted(s);
                            setSkillsOpen(false);
                          }}
                          className="block w-full text-left px-2 py-1 text-[11px] rounded hover:bg-muted cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {aiSubmitted && (
                  <div className="mt-3 rounded-lg bg-muted/50 p-2 text-[11px]">
                    <div className="font-semibold mb-1">Here's what I found for "{aiSubmitted}":</div>
                    <div className="text-muted-foreground">• 2 matching leads in Bengaluru</div>
                    <div className="text-muted-foreground">• 1 quotation pending review</div>
                  </div>
                )}
              </div>

              {/* Automations */}
              <div className="mt-3 rounded-2xl border border-border bg-background p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-2 text-center">Automations</div>
                {automations.slice(0, 3).map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => toggleAutomation(a.id)}
                    className="w-full flex items-center justify-between py-1.5 text-[12px] hover:bg-muted/30 rounded px-1 -mx-1 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {a.state === "done" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />
                      )}
                      <span>{a.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{a.time}</span>
                  </button>
                ))}
              </div>

              {/* Inbox */}
              <div className="mt-3 rounded-2xl border border-border bg-background p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">Inbox</div>
                  <div className="flex items-center gap-1 text-[10px]">
                    {(["Important", "News", "VIPs", "All"] as InboxTab[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setInboxTab(t)}
                        className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
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
                    <div className="py-4 text-center text-[11px] text-muted-foreground">Inbox zero ✨</div>
                  )}
                  {visibleInbox.map((m) => {
                    const isOpen = selectedMsg === m.id;
                    return (
                      <div key={m.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedMsg(isOpen ? null : m.id)}
                          className={`w-full text-left flex items-start gap-2.5 py-2 px-1 -mx-1 rounded transition-colors cursor-pointer ${
                            isOpen ? "bg-muted/40" : "hover:bg-muted/20"
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                            {m.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                              <span>{m.name}</span>
                              {m.count && (
                                <span className="text-[9px] bg-muted text-muted-foreground rounded-full px-1.5">{m.count}</span>
                              )}
                            </div>
                            <div className="text-[11px] truncate">
                              <span className="font-semibold">{m.subject}</span>{" "}
                              <span className="text-muted-foreground">{m.preview}</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground shrink-0">{m.time}</div>
                        </button>
                        {isOpen && (
                          <div className="ml-9 mb-2 mr-1 rounded-lg bg-muted/30 p-2 text-[11px]">
                            <div className="text-foreground">{m.preview}</div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground text-[10px] font-semibold hover:opacity-90 cursor-pointer"
                              >
                                <Reply className="w-3 h-3" /> Reply
                              </button>
                              <button
                                type="button"
                                onClick={() => dismissMsg(m.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] font-semibold hover:bg-background cursor-pointer"
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

              {/* Mobile bottom-nav preview strip */}
              <div className="mt-4 rounded-2xl border border-border bg-background px-2 py-1.5 flex items-center justify-around relative">
                {[
                  { icon: Home, label: "Home", active: true },
                  { icon: BarChart3, label: "Pipeline" },
                  null,
                  { icon: FileText, label: "Quotes" },
                  { icon: Building2, label: "Projects" },
                ].map((it, i) => {
                  if (!it) {
                    return (
                      <div key="add" className="-mt-5 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-4 ring-background">
                        <Plus className="w-4 h-4" />
                      </div>
                    );
                  }
                  const Icon = it.icon;
                  return (
                    <div key={i} className={`flex flex-col items-center gap-0.5 px-1.5 ${it.active ? "text-primary" : "text-muted-foreground"}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-semibold">{it.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 text-center text-[9px] text-muted-foreground/70">Mobile bottom nav</div>
            </>
          )}

          {activeNav === "Overview" && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {KPIS.map((k) => (
                  <div key={k.label} className="rounded-2xl border border-border bg-background p-3">
                    <div className="text-[10px] text-muted-foreground">{k.label}</div>
                    <div className="text-base font-bold mt-0.5">{k.value}</div>
                    <div className="text-[10px] text-primary font-semibold mt-0.5 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {k.delta}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-background p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-2">Leads — last 14 days</div>
                <div className="flex items-end gap-1 h-16">
                  {[40, 55, 30, 70, 60, 80, 45, 65, 90, 55, 75, 60, 85, 95].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-2">Top sources</div>
                  {[
                    { name: "Google Ads", pct: 42, color: "bg-primary" },
                    { name: "Meta Ads", pct: 28, color: "bg-amber-500" },
                    { name: "Referral", pct: 18, color: "bg-emerald-500" },
                    { name: "Walk-in", pct: 12, color: "bg-muted-foreground" },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center gap-2 text-[11px] mb-1">
                      <div className="w-2 h-2 rounded-full" style={{}}>
                        <div className={`w-2 h-2 rounded-full ${s.color}`} />
                      </div>
                      <span className="flex-1">{s.name}</span>
                      <span className="text-muted-foreground">{s.pct}%</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-2">Goal progress</div>
                  <div className="text-[11px] mb-1">Q1 Revenue</div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: "68%" }} />
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">₹38.4L / ₹56L · 68%</div>
                  <div className="text-[11px] mt-3 mb-1">Quotations sent</div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: "47%" }} />
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">14 / 30</div>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Pipeline" && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {PIPELINE_COLS.map((col) => (
                <div key={col.stage} className="rounded-2xl border border-border bg-background p-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">{col.stage}</div>
                    <span className="text-[9px] bg-muted rounded-full px-1.5 text-muted-foreground">{col.leads.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {col.leads.map((l) => (
                      <div key={l.name} className="rounded-lg border border-border bg-muted/30 p-1.5 text-[10px]">
                        <div className="font-semibold">{l.name}</div>
                        <div className="text-muted-foreground">{l.budget}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeNav === "Inbox" && (
            <div className="mt-4 grid grid-cols-[1fr_180px] gap-3">
              <div className="rounded-2xl border border-border bg-background p-3 divide-y divide-border">
                {INITIAL_INBOX.filter((m) => !dismissed.has(m.id)).map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setSelectedMsg(m.id)}
                    className={`w-full text-left flex items-start gap-2.5 py-2 px-1 -mx-1 rounded cursor-pointer transition-colors ${
                      selectedMsg === m.id ? "bg-muted/40" : "hover:bg-muted/20"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                      {m.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold">{m.name}</div>
                      <div className="text-[11px] truncate text-muted-foreground">{m.subject}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">{m.time}</div>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-background p-3 text-[11px]">
                {(() => {
                  const m = INITIAL_INBOX.find((x) => x.id === selectedMsg);
                  if (!m) return <div className="text-muted-foreground">Select a message</div>;
                  return (
                    <>
                      <div className="font-semibold">{m.subject}</div>
                      <div className="text-muted-foreground mt-1">{m.preview}</div>
                      <button
                        type="button"
                        className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground text-[10px] font-semibold cursor-pointer"
                      >
                        <Reply className="w-3 h-3" /> Reply
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {activeNav === "Leads" && (
            <div className="mt-4 rounded-2xl border border-border bg-background overflow-hidden">
              {leadFilter && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 text-[10px]">
                  <span>Filtered by: <span className="font-semibold">{leadFilter}</span></span>
                  <button
                    type="button"
                    onClick={() => setLeadFilter(null)}
                    className="hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-[1fr_1fr_80px_100px] text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold px-3 py-2 border-b border-border">
                <span>Name</span><span>City</span><span>Budget</span><span>Stage</span>
              </div>
              {filteredLeads.map((l) => (
                <div
                  key={l.name}
                  className="grid grid-cols-[1fr_1fr_80px_100px] text-[12px] px-3 py-2 border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors items-center"
                >
                  <span className="font-semibold">{l.name}</span>
                  <span className="text-muted-foreground">{l.city}</span>
                  <span>{l.budget}</span>
                  <span><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLOR[l.stage] ?? "bg-muted text-muted-foreground"}`}>{l.stage}</span></span>
                </div>
              ))}
            </div>
          )}

          {activeNav === "Quotations" && (
            <div className="mt-4 rounded-2xl border border-border bg-background overflow-hidden">
              {QUOTATIONS.map((q) => (
                <div
                  key={q.ref}
                  className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer text-[12px]"
                >
                  <div>
                    <div className="font-semibold">{q.ref} — {q.client}</div>
                    <div className="text-[11px] text-muted-foreground">{q.amount}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLOR[q.status]}`}>{q.status}</span>
                </div>
              ))}
            </div>
          )}

          {activeNav === "Projects" && (
            <div className="mt-4 grid grid-cols-1 gap-2">
              {PROJECTS.map((p) => (
                <div key={p.name} className="rounded-2xl border border-border bg-background p-3 hover:border-primary/40 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">{p.phase}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground text-right">{p.progress}%</div>
                </div>
              ))}
            </div>
          )}

          {activeNav === "Vendors" && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {VENDORS.map((v) => (
                <div key={v.name} className="rounded-2xl border border-border bg-background p-3 hover:border-primary/40 cursor-pointer transition-colors">
                  <div className="text-[12px] font-semibold">{v.name}</div>
                  <div className="text-[10px] text-muted-foreground">{v.category}</div>
                </div>
              ))}
            </div>
          )}

          {activeNav === "Finance" && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {FINANCE_KPIS.map((k) => (
                  <div key={k.label} className="rounded-2xl border border-border bg-background p-3">
                    <div className="text-[10px] text-muted-foreground">{k.label}</div>
                    <div className="text-base font-bold mt-0.5 flex items-center gap-0.5">
                      <IndianRupee className="w-3 h-3" />{k.value.replace("₹", "")}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-background overflow-hidden">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold px-3 py-2 border-b border-border">Recent invoices</div>
                {FINANCE_INVOICES.map((inv) => (
                  <div key={inv.ref} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-0 text-[12px]">
                    <div>
                      <div className="font-semibold">{inv.ref} — {inv.client}</div>
                      <div className="text-[10px] text-muted-foreground">{inv.amount}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${inv.status === "Paid" ? "bg-primary/15 text-primary" : "bg-amber-500/20 text-amber-700 dark:text-amber-400"}`}>{inv.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeNav === "Marketing" && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {MARKETING_CHANNELS.map((c) => (
                  <div key={c.name} className="rounded-2xl border border-border bg-background p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] font-semibold">{c.name}</div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">Live</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                      <div><div className="text-muted-foreground">Spend</div><div className="font-semibold">{c.spend}</div></div>
                      <div><div className="text-muted-foreground">Leads</div><div className="font-semibold">{c.leads}</div></div>
                      <div><div className="text-muted-foreground">CPL</div><div className="font-semibold">{c.cpl}</div></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-background p-3 text-[11px] flex items-center justify-between">
                <span className="font-semibold">3 active campaigns</span>
                <span className="text-muted-foreground">62 leads this month · CPL ₹1,128</span>
              </div>
            </div>
          )}

          {activeNav === "Tasks" && (
            <div className="mt-4 rounded-2xl border border-border bg-background p-3">
              {tasks.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                  className="w-full flex items-center gap-2 py-1.5 text-[12px] hover:bg-muted/20 px-1 -mx-1 rounded cursor-pointer text-left"
                >
                  {t.done ? (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                </button>
              ))}
            </div>
          )}

          {activeNav === "Automations" && (
            <div className="mt-4 rounded-2xl border border-border bg-background p-3">
              {automations.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-[12px] border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {a.state === "done" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />
                    )}
                    <span>{a.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAutomation(a.id)}
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      a.state === "done" ? "bg-primary/15 text-primary" : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {a.state === "done" ? "Done" : "Running"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeNav === "Team" && (
            <div className="mt-4 space-y-2">
              {TEAM.map((p) => (
                <div key={p.name} className="flex items-center gap-2.5 rounded-2xl border border-border bg-background px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {p.initials}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">{p.role}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{p.deals} deals</div>
                </div>
              ))}
            </div>
          )}

          {activeNav === "Templates" && (
            <div className="mt-4 grid grid-cols-1 gap-2">
              {TEMPLATES.map((t) => (
                <div key={t.name} className="rounded-2xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-semibold">{t.name}</div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-semibold">{t.channel}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</div>
                </div>
              ))}
            </div>
          )}

          {activeNav === "Branding" && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border bg-background p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-2">Logo</div>
                <div className="flex items-center gap-2">
                  <img src={logo} alt="" className="w-10 h-10 rounded-lg object-contain bg-muted/40 p-1" />
                  <div className="text-[11px]">
                    <div className="font-semibold">Chirpeel Studio</div>
                    <div className="text-muted-foreground">chirpeel.in</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-2">Brand colors</div>
                <div className="flex gap-1.5">
                  <div className="w-8 h-8 rounded-lg bg-primary" />
                  <div className="w-8 h-8 rounded-lg bg-foreground" />
                  <div className="w-8 h-8 rounded-lg bg-accent" />
                  <div className="w-8 h-8 rounded-lg bg-muted border border-border" />
                </div>
              </div>
              <div className="col-span-2 rounded-2xl border border-border bg-background p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-1">Typography</div>
                <div className="font-display text-base font-bold">Playfair Display — Headings</div>
                <div className="text-[12px] text-muted-foreground">DM Sans — Body text for invoices, quotations and the client portal.</div>
              </div>
            </div>
          )}

          {activeNav === "Settings" && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SETTINGS_GROUPS.map((g) => (
                <div key={g.title} className="rounded-2xl border border-border bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-2">{g.title}</div>
                  <div className="space-y-1">
                    {g.items.map((it) => (
                      <div key={it} className="text-[11px] flex items-center justify-between hover:bg-muted/30 -mx-1 px-1 py-1 rounded cursor-pointer">
                        <span>{it}</span>
                        <span className="text-muted-foreground">›</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
