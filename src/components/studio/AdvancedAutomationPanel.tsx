import { useState, useEffect, useMemo } from "react";
import {
  Zap, Play, CheckCircle2, AlertCircle, XCircle, Search, Plus, Terminal,
  Sliders, Bot, Sparkles, Clock, ArrowRight, Trash2, SlidersHorizontal,
  MessageSquare, Send, FileText, Check, FolderCheck, RefreshCw, Eye, Pause,
  Share2, Database, Key, HelpCircle, HardDrive, UserCheck, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogClose, DialogTrigger
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Rule {
  id: string;
  title: string;
  trigger: string;
  condition: string;
  action: string;
  active: boolean;
  stats: {
    runs: number;
    successRate: number;
    lastRun: string;
  };
  description: string;
  category: "CRM" | "WhatsApp" | "Files" | "Finance";
}

interface LogEntry {
  id: string;
  ruleTitle: string;
  timestamp: string;
  status: "success" | "warning" | "failed";
  triggerSource: string;
  details: string;
  durationMs: number;
}

const DEFAULT_RULES: Rule[] = [
  {
    id: "rule-1",
    title: "Enrich New Lead Data",
    trigger: "Lead Created",
    condition: "Source is Website / Meta Ads",
    action: "Enrich via Google Search & LinkedIn API",
    active: true,
    stats: { runs: 124, successRate: 98.4, lastRun: "10 mins ago" },
    description: "Automatically scrapes LinkedIn profiles and company websites for newly created leads to fill email, company size, and role.",
    category: "CRM"
  },
  {
    id: "rule-2",
    title: "Send Onboarding WhatsApp",
    trigger: "Lead stage moves to Site Visit",
    condition: "Phone number is valid",
    action: "Send Template Message: 'Onboarding'",
    active: true,
    stats: { runs: 86, successRate: 100, lastRun: "1 hour ago" },
    description: "Sends a friendly introduction WhatsApp message detailing what to expect during the upcoming designer visit.",
    category: "WhatsApp"
  },
  {
    id: "rule-3",
    title: "Sync Approved Quotation to Drive",
    trigger: "Quotation Status changes to Approved",
    condition: "None",
    action: "Export PDF & Upload to Client Folder",
    active: true,
    stats: { runs: 42, successRate: 95.2, lastRun: "2 hours ago" },
    description: "Generates a clean snapshot PDF of signed quotes and saves them to the client's dedicated folder in Google Drive.",
    category: "Files"
  },
  {
    id: "rule-4",
    title: "Auto-create BOQ template from Client Brief",
    trigger: "Lead Created",
    condition: "Requirement brief is uploaded",
    action: "Parse file and seed BOQ draft catalog",
    active: false,
    stats: { runs: 12, successRate: 83.3, lastRun: "Yesterday" },
    description: "Uses OCR/AI to read uploaded project brief PDFs and automatically creates standard BOQ list items with matching pricing templates.",
    category: "CRM"
  },
  {
    id: "rule-5",
    title: "High Budget Assignment",
    trigger: "Lead Created",
    condition: "Budget is above ₹15,00,000",
    action: "Assign Lead to Senior Designer",
    active: true,
    stats: { runs: 39, successRate: 100, lastRun: "3 hours ago" },
    description: "Detects premium leads and immediately routes them to senior staff, skipping standard round-robin routing.",
    category: "CRM"
  },
  {
    id: "rule-6",
    title: "Unpaid Invoice WhatsApp Nudge",
    trigger: "Invoice Payment Overdue",
    condition: "Delay is > 7 days",
    action: "Send WhatsApp: 'Invoice Nudge'",
    active: true,
    stats: { runs: 28, successRate: 92.8, lastRun: "2 days ago" },
    description: "Sends a polite automated payment reminder containing the invoice link and UPI scanner details to client.",
    category: "Finance"
  }
];

const DEFAULT_LOGS: LogEntry[] = [
  {
    id: "log-1",
    ruleTitle: "Enrich New Lead Data",
    timestamp: "2026-06-04 22:10:04",
    status: "success",
    triggerSource: "Lead Form: Karthik R",
    details: "Found LinkedIn Profile 'linkedin.com/in/karthik-r'. Added email: 'karthik.r@domain.com'. Added designation: 'Product Manager'.",
    durationMs: 1420
  },
  {
    id: "log-2",
    ruleTitle: "Send Onboarding WhatsApp",
    timestamp: "2026-06-04 21:15:32",
    status: "success",
    triggerSource: "Lead Stage Change: Meera S.",
    details: "Template 'Site Visit Intro' sent to +919876543210. Delivery receipt received (status code 200).",
    durationMs: 680
  },
  {
    id: "log-3",
    ruleTitle: "Sync Approved Quotation to Drive",
    timestamp: "2026-06-04 20:30:11",
    status: "success",
    triggerSource: "Quotation Approved: Q-1041",
    details: "Rendered PDF (1.2 MB). Saved to Drive path '/Chirpeel/Clients/Priya R/Quotations/Q-1041_Approved.pdf'. File ID: gdrive_981a2f.",
    durationMs: 2450
  },
  {
    id: "log-4",
    ruleTitle: "Unpaid Invoice WhatsApp Nudge",
    timestamp: "2026-06-03 14:00:00",
    status: "warning",
    triggerSource: "System Cron: Invoice #INV-821",
    details: "Nudge text drafted. Target phone number +918239100234 matches DND settings. Sent notification to CRM sales owner to review manually.",
    durationMs: 410
  },
  {
    id: "log-5",
    ruleTitle: "Auto-create BOQ template from Client Brief",
    timestamp: "2026-06-03 10:42:15",
    status: "failed",
    triggerSource: "Brief Upload: Jai K.",
    details: "Unable to parse brief file 'jai_brief_scan.jpg' (resolution too low). AI OCR parsing failed at Confidence score 0.32. Error: PARSE_TIMEOUT.",
    durationMs: 3800
  }
];

const TEMPLATES = [
  {
    title: "Slack / Teams Notifications",
    description: "Alert your internal design and sales channels instantly when high-value leads come in.",
    trigger: "Lead Created",
    condition: "Budget is above ₹10L",
    action: "Send Webhook to Slack Workspace",
    category: "CRM",
    icon: Share2
  },
  {
    title: "Milestone Client Status Emails",
    description: "Notify clients automatically with full reports as site work phases are marked complete.",
    trigger: "Project Milestone Completed",
    condition: "None",
    action: "Send Email: 'Milestone Report'",
    category: "CRM",
    icon: FileText
  },
  {
    title: "Double-Entry Finance Audit Sync",
    description: "Sync approved expenses or paid invoices immediately to online bookkeeping software.",
    trigger: "Payment Received",
    condition: "None",
    action: "Sync to QuickBooks Online API",
    category: "Finance",
    icon: Database
  },
  {
    title: "Project Creation on Initial Booking",
    description: "Set up project folders, timelines, and assign standard vendors when booking amount is paid.",
    trigger: "Payment Received",
    condition: "Is Booking Advance = True",
    action: "Initialize Project & Timelines",
    category: "Files",
    icon: FolderCheck
  },
  {
    title: "WhatsApp Welcome and Portfolio Share",
    description: "Immediately share your catalog and welcome message on WhatsApp when a lead is captured.",
    trigger: "Lead Created",
    condition: "None",
    action: "Send WhatsApp: 'Welcome Kit'",
    category: "WhatsApp",
    icon: MessageSquare
  }
];

const TRIGGERS = [
  "Lead Created",
  "Lead Stage Changed",
  "Quotation Approved",
  "Quotation Sent",
  "Payment Received",
  "Project Milestone Completed",
  "Invoice Payment Overdue",
  "Task Overdue"
];

const CONDITIONS = [
  "None",
  "Budget is above ₹10,00,000",
  "Budget is above ₹15,00,000",
  "Lead Source is Website / Meta Ads",
  "Delay is > 7 days",
  "Lead City is Coimbatore",
  "Is Booking Advance = True"
];

const ACTIONS = [
  "Send WhatsApp Message",
  "Send Email Notification",
  "Create Folder in Google Drive",
  "Enrich via LinkedIn API",
  "Assign Lead to Senior Designer",
  "Initialize Project & Timelines",
  "Send Webhook to Slack Workspace",
  "Sync to QuickBooks Online API"
];

export function AdvancedAutomationPanel() {
  // Loaded from localStorage to give realistic CRUD state
  const [rules, setRules] = useState<Rule[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chirpeel:automation-rules");
      return saved ? JSON.parse(saved) : DEFAULT_RULES;
    }
    return DEFAULT_RULES;
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chirpeel:automation-logs");
      return saved ? JSON.parse(saved) : DEFAULT_LOGS;
    }
    return DEFAULT_LOGS;
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [activeTab, setActiveTab] = useState("rules");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTrigger, setFormTrigger] = useState(TRIGGERS[0]);
  const [formCondition, setFormCondition] = useState(CONDITIONS[0]);
  const [formAction, setFormAction] = useState(ACTIONS[0]);
  const [formCategory, setFormCategory] = useState<"CRM" | "WhatsApp" | "Files" | "Finance">("CRM");

  // Simulator state
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatorRule, setSimulatorRule] = useState<Rule | null>(null);
  const [simulatorStep, setSimulatorStep] = useState(0);
  const [simulatorLogs, setSimulatorLogs] = useState<string[]>([]);
  const [simulatorProgress, setSimulatorProgress] = useState(0);
  const [simulatorIsRunning, setSimulatorIsRunning] = useState(false);

  // AI prompt state
  const [aiPromptText, setAiPromptText] = useState("");
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [aiBlueprint, setAiBlueprint] = useState<{
    title: string;
    trigger: string;
    condition: string;
    action: string;
    category: "CRM" | "WhatsApp" | "Files" | "Finance";
    confidence: number;
    explanation: string;
  } | null>(null);

  // Persistence sync
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chirpeel:automation-rules", JSON.stringify(rules));
    }
  }, [rules]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chirpeel:automation-logs", JSON.stringify(logs));
    }
  }, [logs]);

  // Statistics calculations
  const stats = useMemo(() => {
    const activeCount = rules.filter(r => r.active).length;
    const totalRuns = rules.reduce((acc, r) => acc + r.stats.runs, 0);
    const avgSuccess = rules.length 
      ? Math.round(rules.reduce((acc, r) => acc + r.stats.successRate, 0) / rules.length)
      : 100;
    
    return {
      total: rules.length,
      active: activeCount,
      runs: totalRuns,
      successRate: avgSuccess
    };
  }, [rules]);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === "All" || r.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [rules, searchQuery, categoryFilter]);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingRule(null);
    setFormTitle("");
    setFormDescription("");
    setFormTrigger(TRIGGERS[0]);
    setFormCondition(CONDITIONS[0]);
    setFormAction(ACTIONS[0]);
    setFormCategory("CRM");
    setShowAddModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (rule: Rule) => {
    setEditingRule(rule);
    setFormTitle(rule.title);
    setFormDescription(rule.description);
    setFormTrigger(rule.trigger);
    setFormCondition(rule.condition);
    setFormAction(rule.action);
    setFormCategory(rule.category);
    setShowAddModal(true);
  };

  // Save custom rule
  const handleSaveRule = () => {
    if (!formTitle.trim()) {
      toast.error("Please provide a name for this automation rule");
      return;
    }

    if (editingRule) {
      // Update
      setRules(prev => prev.map(r => r.id === editingRule.id ? {
        ...r,
        title: formTitle,
        description: formDescription || `Automated task when ${formTrigger}`,
        trigger: formTrigger,
        condition: formCondition,
        action: formAction,
        category: formCategory
      } : r));
      toast.success("Automation rule updated successfully");
    } else {
      // Create new
      const newRule: Rule = {
        id: `rule-${Date.now()}`,
        title: formTitle,
        description: formDescription || `Automated task when ${formTrigger}`,
        trigger: formTrigger,
        condition: formCondition,
        action: formAction,
        active: true,
        stats: { runs: 0, successRate: 100, lastRun: "Never" },
        category: formCategory
      };
      setRules(prev => [newRule, ...prev]);
      toast.success("New automation rule activated!");
    }
    setShowAddModal(false);
  };

  // Toggle active state
  const handleToggleActive = (id: string) => {
    setRules(prev => prev.map(r => {
      if (r.id === id) {
        const nextActive = !r.active;
        toast.success(nextActive ? `"${r.title}" activated` : `"${r.title}" paused`);
        return { ...r, active: nextActive };
      }
      return r;
    }));
  };

  // Delete rule
  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast.error("Automation rule removed");
  };

  // Use Template action
  const handleUseTemplate = (template: typeof TEMPLATES[0]) => {
    setEditingRule(null);
    setFormTitle(template.title);
    setFormDescription(template.description);
    setFormTrigger(template.trigger);
    setFormCondition(template.condition);
    
    // Match template action text with our dropdown ACTIONS list
    const actionMatch = ACTIONS.find(a => a.toLowerCase().includes(template.action.toLowerCase())) || ACTIONS[0];
    setFormAction(actionMatch);
    setFormCategory(template.category as any);
    setShowAddModal(true);
    toast.info("Configuring automation from template...");
  };

  // Start Simulation
  const handleRunSimulation = (rule: Rule) => {
    setSimulatorRule(rule);
    setSimulatorLogs([]);
    setSimulatorStep(0);
    setSimulatorProgress(0);
    setSimulatorOpen(true);
    setSimulatorIsRunning(true);
  };

  // Simulator step execution loop
  useEffect(() => {
    if (!simulatorIsRunning || !simulatorRule) return;

    const delay = 700; // time per log step in ms
    let timer: NodeJS.Timeout;

    const steps = [
      `[INFO] Initializing Chirpeel Trigger Engine v2.4...`,
      `[EVENT] Listening for event: "${simulatorRule.trigger}"`,
      `[MATCH] Caught matching event from: System Simulation Agent`,
      `[EVAL] Evaluating rule condition: "${simulatorRule.condition}"`,
      simulatorRule.condition !== "None" 
        ? `[EVAL] Condition matches successfully (Expression resolved to TRUE)`
        : `[EVAL] No conditions required. Proceeding to action dispatch.`,
      `[DISPATCH] Resolving action driver for: "${simulatorRule.action}"`,
      `[API] Connecting to external service gateway... Status: 200 OK`,
      `[EXECUTE] Executing action payload. Template parsing completed.`,
      `[SUCCESS] Action executed successfully in 142ms. HTTP 200 OK.`,
      `[DATABASE] Writing execution log details to db... Done.`
    ];

    if (simulatorStep < steps.length) {
      timer = setTimeout(() => {
        setSimulatorLogs(prev => [...prev, steps[simulatorStep]]);
        setSimulatorStep(prev => prev + 1);
        setSimulatorProgress(Math.round(((simulatorStep + 1) / steps.length) * 100));
      }, delay);
    } else {
      // Completed simulation
      setSimulatorIsRunning(false);
      
      // Update rules count
      setRules(prev => prev.map(r => r.id === simulatorRule.id ? {
        ...r,
        stats: {
          runs: r.stats.runs + 1,
          successRate: Math.round(((r.stats.runs * r.stats.successRate + 100) / (r.stats.runs + 1)) * 10) / 10,
          lastRun: "Just now"
        }
      } : r));

      // Append real log entry
      const newLog: LogEntry = {
        id: `log-${Date.now()}`,
        ruleTitle: simulatorRule.title,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        status: "success",
        triggerSource: `Simulated: ${simulatorRule.trigger}`,
        details: `Successfully completed action "${simulatorRule.action}" triggered by "${simulatorRule.trigger}". Condition evaluated: "${simulatorRule.condition}".`,
        durationMs: Math.round(100 + Math.random() * 200)
      };
      setLogs(prev => [newLog, ...prev]);
      
      toast.success(`Simulation for "${simulatorRule.title}" complete! Activity log appended.`);
    }

    return () => clearTimeout(timer);
  }, [simulatorIsRunning, simulatorStep, simulatorRule]);

  // AI Prompt Parser NLP Simulation
  const handleParseAiPrompt = () => {
    if (!aiPromptText.trim()) {
      toast.error("Please enter a description for the automation");
      return;
    }

    setIsParsingAi(true);
    setAiBlueprint(null);

    // Simulate natural language parsing delay
    setTimeout(() => {
      const text = aiPromptText.toLowerCase();
      
      // Basic heuristics matching
      let trigger = "Lead Created";
      let condition = "None";
      let action = "Send WhatsApp Message";
      let category: "CRM" | "WhatsApp" | "Files" | "Finance" = "WhatsApp";
      let title = "WhatsApp Welcome Notification";
      let explanation = "Detected keyword 'welcome' or 'whatsapp'. Automatically sets up a WhatsApp send on new leads.";

      if (text.includes("budget") || text.includes("value") || text.includes("high")) {
        trigger = "Lead Created";
        condition = "Budget is above ₹15,00,000";
        action = "Assign Lead to Senior Designer";
        category = "CRM";
        title = "High Budget VIP Assignment";
        explanation = "Detected request targeting lead budgets. Auto-assigns designers to leads exceeding ₹15L.";
      } else if (text.includes("invoice") || text.includes("unpaid") || text.includes("payment overdue") || text.includes("nudge")) {
        trigger = "Invoice Payment Overdue";
        condition = "Delay is > 7 days";
        action = "Send WhatsApp Message";
        category = "Finance";
        title = "Automated Invoice Reminder Nudge";
        explanation = "Detected finance terms ('invoice', 'overdue'). Dispatches WhatsApp payment links if unpaid for 7 days.";
      } else if (text.includes("drive") || text.includes("google drive") || text.includes("folder") || text.includes("pdf")) {
        trigger = "Quotation Approved";
        condition = "None";
        action = "Create Folder in Google Drive";
        category = "Files";
        title = "Google Drive Sync on Quote Signature";
        explanation = "Detected sync terms ('drive', 'folder'). Triggers directory setups and uploads on client signature.";
      } else if (text.includes("milestone") || text.includes("stage") || text.includes("project")) {
        trigger = "Project Milestone Completed";
        condition = "None";
        action = "Send Email Notification";
        category = "CRM";
        title = "Milestone Progress Status Alerts";
        explanation = "Detected milestone completion indicators. Dispatches progress status updates to project stakeholders.";
      } else if (text.includes("slack") || text.includes("webhook") || text.includes("notify")) {
        trigger = "Lead Created";
        condition = "None";
        action = "Send Webhook to Slack Workspace";
        category = "CRM";
        title = "Slack Channel CRM Notification";
        explanation = "Detected messaging webhook triggers. Connects inbound lead notifications directly into Slack.";
      }

      setAiBlueprint({
        title,
        trigger,
        condition,
        action,
        category,
        confidence: Math.round(85 + Math.random() * 14),
        explanation
      });
      setIsParsingAi(false);
      toast.success("AI Blueprint generated successfully!");
    }, 1500);
  };

  const handleApplyAiBlueprint = () => {
    if (!aiBlueprint) return;

    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      title: aiBlueprint.title,
      description: aiBlueprint.explanation,
      trigger: aiBlueprint.trigger,
      condition: aiBlueprint.condition,
      action: aiBlueprint.action,
      active: true,
      stats: { runs: 0, successRate: 100, lastRun: "Never" },
      category: aiBlueprint.category
    };

    setRules(prev => [newRule, ...prev]);
    setAiBlueprint(null);
    setAiPromptText("");
    setActiveTab("rules");
    toast.success(`Activated rule: "${newRule.title}"`);
  };

  const clearAllLogs = () => {
    setLogs([]);
    toast.info("Execution logs cleared");
  };

  return (
    <div className="space-y-6">
      {/* Statistics Header Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-border/80 shadow-sm bg-gradient-to-br from-background to-muted/10">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Zap className="w-16 h-16 text-primary" />
          </div>
          <CardContent className="p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Rules</div>
            <div className="text-3xl font-extrabold mt-1 font-display">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-2">
              <span className="font-semibold text-primary">{stats.active}</span> running active workflows
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/80 shadow-sm bg-gradient-to-br from-background to-muted/10">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Play className="w-16 h-16 text-emerald-500" />
          </div>
          <CardContent className="p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Successful Runs</div>
            <div className="text-3xl font-extrabold mt-1 font-display">{stats.runs}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Across all configured automations
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/80 shadow-sm bg-gradient-to-br from-background to-muted/10">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <CheckCircle2 className="w-16 h-16 text-blue-500" />
          </div>
          <CardContent className="p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg. Success Rate</div>
            <div className="text-3xl font-extrabold mt-1 font-display text-blue-600 dark:text-blue-400">{stats.successRate}%</div>
            <div className="text-xs text-muted-foreground mt-2">
              High resilience execution gateway
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/80 shadow-sm bg-gradient-to-br from-background to-muted/10">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Bot className="w-16 h-16 text-amber-500" />
          </div>
          <CardContent className="p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Agent Status</div>
            <div className="text-3xl font-extrabold mt-1 font-display text-amber-600 dark:text-amber-400">Ready</div>
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> NLP translation engines online
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs list navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border/50 pb-2">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-fit inline-flex">
            <TabsTrigger value="rules" className="rounded-lg px-4 py-2 cursor-pointer transition-all">Active Rules</TabsTrigger>
            <TabsTrigger value="templates" className="rounded-lg px-4 py-2 cursor-pointer transition-all">Templates</TabsTrigger>
            <TabsTrigger value="logs" className="rounded-lg px-4 py-2 cursor-pointer transition-all">Execution Logs</TabsTrigger>
            <TabsTrigger value="ai" className="rounded-lg px-4 py-2 cursor-pointer transition-all flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Blueprint
            </TabsTrigger>
          </TabsList>

          {activeTab === "rules" && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search automations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-lg"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
              >
                <option value="All">All Categories</option>
                <option value="CRM">CRM</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Files">Files</option>
                <option value="Finance">Finance</option>
              </select>
              <Button onClick={handleOpenAdd} size="sm" className="h-9 gap-1 text-xs">
                <Plus className="w-4 h-4" /> Add Rule
              </Button>
            </div>
          )}

          {activeTab === "logs" && logs.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllLogs} className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-9">
              <Trash2 className="w-4 h-4 mr-1.5" /> Clear All Logs
            </Button>
          )}
        </div>

        {/* --- TAB CONTENT: RULES --- */}
        <TabsContent value="rules" className="mt-0 outline-none">
          {filteredRules.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/20">
              <Sliders className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No automations found</h3>
              <p className="text-xs text-muted-foreground mt-1">Try relaxing your search query or categories.</p>
              <Button onClick={handleOpenAdd} size="sm" className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" /> Create first rule
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRules.map((rule) => (
                <Card 
                  key={rule.id} 
                  className={`relative overflow-hidden border transition-all duration-200 hover:shadow-md ${
                    rule.active 
                      ? "border-border shadow-sm" 
                      : "border-border/60 opacity-70 bg-muted/10 shadow-none"
                  }`}
                >
                  {/* Category Accent Indicator */}
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    rule.category === "WhatsApp" ? "bg-green-500" :
                    rule.category === "Finance" ? "bg-amber-500" :
                    rule.category === "Files" ? "bg-blue-500" : "bg-primary"
                  }`} />
                  
                  <CardHeader className="p-4 pb-2 pl-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rule.category === "WhatsApp" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                            rule.category === "Finance" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                            rule.category === "Files" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400" :
                            "bg-primary/10 text-primary"
                          }`}>
                            {rule.category}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-foreground mt-1 tracking-tight">{rule.title}</h4>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.active}
                          onCheckedChange={() => handleToggleActive(rule.id)}
                          aria-label="Toggle active status"
                          className="scale-90"
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 pl-5 space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed min-h-[32px]">
                      {rule.description}
                    </p>

                    {/* Flow details view */}
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 text-[11px] space-y-1.5 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-16 shrink-0">Trigger:</span>
                        <span className="text-foreground font-semibold flex items-center gap-1 truncate">
                          <Zap className="w-3.5 h-3.5 text-primary" /> {rule.trigger}
                        </span>
                      </div>
                      {rule.condition !== "None" && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground w-16 shrink-0">Condition:</span>
                          <span className="text-foreground flex items-center gap-1 truncate font-semibold">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" /> {rule.condition}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-16 shrink-0">Action:</span>
                        <span className="text-primary flex items-center gap-1 truncate font-semibold">
                          <ArrowRight className="w-3.5 h-3.5" /> {rule.action}
                        </span>
                      </div>
                    </div>

                    {/* Stats and controls footer */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                      <div className="flex items-center gap-4">
                        <div>Runs: <span className="font-semibold text-foreground">{rule.stats.runs}</span></div>
                        <div>Success: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{rule.stats.successRate}%</span></div>
                        <div className="hidden sm:inline">Last: <span className="font-semibold text-foreground">{rule.stats.lastRun}</span></div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRunSimulation(rule)}
                          disabled={!rule.active}
                          className="w-7 h-7 hover:bg-emerald-500/10 hover:text-emerald-600 disabled:opacity-30 cursor-pointer"
                          title="Simulate Run"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenEdit(rule)}
                          className="w-7 h-7 hover:bg-primary/10 hover:text-primary cursor-pointer"
                          title="Edit automation"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteRule(rule.id)}
                          className="w-7 h-7 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          title="Delete automation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* --- TAB CONTENT: TEMPLATES --- */}
        <TabsContent value="templates" className="mt-0 outline-none">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-base font-bold text-foreground">Automation Blueprint Library</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select a pre-configured template to set up standard CRM, messaging, and storage workflows in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((tmpl, idx) => {
              const IconComp = tmpl.icon;
              return (
                <Card key={idx} className="flex flex-col border border-border/80 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate">{tmpl.title}</h4>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">{tmpl.category}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-between space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tmpl.description}
                    </p>
                    <div className="space-y-1 text-[10px] bg-muted/40 p-2 rounded-lg border border-border/40 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-12 shrink-0">Trigger:</span>
                        <span className="text-foreground truncate">{tmpl.trigger}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-12 shrink-0">Action:</span>
                        <span className="text-primary font-semibold truncate">{tmpl.action}</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => handleUseTemplate(tmpl)}
                      className="w-full text-xs font-semibold hover:bg-primary hover:text-primary-foreground cursor-pointer"
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* --- TAB CONTENT: EXECUTION LOGS --- */}
        <TabsContent value="logs" className="mt-0 outline-none">
          {logs.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/20">
              <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No logs captured yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Run tests or activate rules to start capturing execution logs.</p>
            </div>
          ) : (
            <Card className="border border-border/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/70 text-muted-foreground font-semibold border-b border-border/60">
                      <th className="p-3 pl-4">Timestamp</th>
                      <th className="p-3">Automation Rule</th>
                      <th className="p-3">Trigger Source</th>
                      <th className="p-3">Result Status</th>
                      <th className="p-3">Execution Speed</th>
                      <th className="p-3 pr-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 pl-4 font-mono text-[10px] text-muted-foreground">
                          {log.timestamp}
                        </td>
                        <td className="p-3 font-semibold text-foreground">
                          {log.ruleTitle}
                        </td>
                        <td className="p-3 text-muted-foreground truncate max-w-[180px]">
                          {log.triggerSource}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            log.status === "success" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                            log.status === "warning" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                            "bg-destructive/10 text-destructive"
                          }`}>
                            {log.status === "success" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                            {log.status === "warning" && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            {log.status === "failed" && <XCircle className="w-3 h-3 text-destructive" />}
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-muted-foreground">
                          {log.durationMs}ms
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-muted cursor-pointer" title="View Payload details">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-base font-bold">Execution Details</DialogTitle>
                                <DialogDescription className="text-xs">
                                  System telemetry report for run ID: <span className="font-mono">{log.id}</span>
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 my-2 text-xs">
                                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/40">
                                  <span className="font-semibold text-muted-foreground">Rule Name</span>
                                  <span className="col-span-2 font-semibold text-foreground">{log.ruleTitle}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/40">
                                  <span className="font-semibold text-muted-foreground">Timestamp</span>
                                  <span className="col-span-2 font-mono text-muted-foreground">{log.timestamp}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/40">
                                  <span className="font-semibold text-muted-foreground">Source Event</span>
                                  <span className="col-span-2 text-foreground font-semibold">{log.triggerSource}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/40">
                                  <span className="font-semibold text-muted-foreground">Response Speed</span>
                                  <span className="col-span-2 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{log.durationMs}ms</span>
                                </div>
                                <div className="space-y-1.5">
                                  <span className="font-semibold text-muted-foreground block">System Execution Logs Output</span>
                                  <div className="bg-muted p-3 rounded-lg border border-border/60 font-mono text-[10px] text-foreground leading-relaxed whitespace-pre-wrap">
                                    {log.details}
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button size="sm" className="text-xs">Close</Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* --- TAB CONTENT: AI PROMPTS --- */}
        <TabsContent value="ai" className="mt-0 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Input prompt container */}
            <Card className="lg:col-span-5 border border-border/80 shadow-sm flex flex-col justify-between">
              <CardHeader className="p-5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                    <Bot className="w-5 h-5 text-amber-500 animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-1.5">
                      AI Generative Blueprinting
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Convert plain English automation requests into configured live triggers.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-5 pt-0 space-y-4 flex-1">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-prompt-input" className="text-xs font-semibold">Describe your workflow</Label>
                  <textarea
                    id="ai-prompt-input"
                    rows={4}
                    placeholder="E.g., assign high budget leads above 15 Lakhs to Senior Designer..."
                    value={aiPromptText}
                    onChange={(e) => setAiPromptText(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/60 leading-relaxed"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Try Examples:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "email me when booking payment is received",
                      "whatsapp nudge client on unpaid invoice after 7 days",
                      "sync quotation to google drive on approve"
                    ].map((example, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAiPromptText(example)}
                        className="text-[10px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded-md border border-border/30 transition-all cursor-pointer text-left"
                      >
                        "{example}"
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
              
              <div className="p-5 pt-0">
                <Button 
                  onClick={handleParseAiPrompt} 
                  disabled={isParsingAi}
                  className="w-full text-xs font-semibold gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white cursor-pointer shadow-sm shadow-amber-500/10"
                >
                  {isParsingAi ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Parsing query blueprint...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate Automation Blueprint
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Results blueprint visualization */}
            <Card className="lg:col-span-7 border border-border/80 shadow-sm flex flex-col justify-between bg-gradient-to-br from-background to-muted/10">
              <CardHeader className="p-5 border-b border-border/40">
                <CardTitle className="text-base font-bold">Generated Workflow Schema</CardTitle>
                <CardDescription className="text-xs">
                  Your generated blueprint layout details will appear below.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-5 flex-1 flex flex-col justify-center">
                {aiBlueprint ? (
                  <div className="space-y-4 animate-reveal">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-foreground">{aiBlueprint.title}</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Confidence: {aiBlueprint.confidence}%
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed bg-background/50 border border-border/40 p-2.5 rounded-lg">
                      {aiBlueprint.explanation}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-background border border-border/50 p-2.5 rounded-lg">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Trigger Event</span>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{aiBlueprint.trigger}</span>
                        </div>
                      </div>

                      <div className="bg-background border border-border/50 p-2.5 rounded-lg">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Condition</span>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{aiBlueprint.condition}</span>
                        </div>
                      </div>

                      <div className="bg-background border border-border/50 p-2.5 rounded-lg">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Target Action</span>
                        <div className="text-xs font-semibold text-primary flex items-center gap-1">
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{aiBlueprint.action}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <h4 className="text-xs font-semibold">No blueprint generated yet</h4>
                    <p className="text-[11px] max-w-xs mx-auto mt-1 leading-normal">
                      Write a description on the left and click generate to translate it into a structured CRM schema.
                    </p>
                  </div>
                )}
              </CardContent>

              <div className="p-5 border-t border-border/40 bg-muted/20 flex items-center justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={!aiBlueprint}
                  onClick={() => setAiBlueprint(null)}
                  className="text-xs cursor-pointer"
                >
                  Discard
                </Button>
                <Button 
                  size="sm" 
                  disabled={!aiBlueprint}
                  onClick={handleApplyAiBlueprint}
                  className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground cursor-pointer shadow-sm shadow-primary/10"
                >
                  Activate & Save Rule
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* --- MODAL DIALOG: RULE BUILDER (ADD / EDIT) --- */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingRule ? "Edit Automation Rule" : "Create Custom CRM Automation"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Establish event-driven hooks to sync your templates, projects, and external APIs dynamically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-2 text-xs">
            <div className="grid grid-cols-1 gap-1.5">
              <Label htmlFor="form-rule-title" className="font-semibold text-foreground">Rule Name</Label>
              <Input
                id="form-rule-title"
                placeholder="E.g., High-Value Deal WhatsApp Slack Sync"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="text-xs h-9 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <Label htmlFor="form-rule-desc" className="font-semibold text-foreground">Description</Label>
              <textarea
                id="form-rule-desc"
                rows={2}
                placeholder="Explain the workflow intent (optional)..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-rule-trigger" className="font-semibold text-foreground">1. When Event Happens (Trigger)</Label>
                <select
                  id="form-rule-trigger"
                  value={formTrigger}
                  onChange={(e) => setFormTrigger(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                >
                  {TRIGGERS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-rule-condition" className="font-semibold text-foreground">2. Under Condition (Optional)</Label>
                <select
                  id="form-rule-condition"
                  value={formCondition}
                  onChange={(e) => setFormCondition(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                >
                  {CONDITIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-rule-action" className="font-semibold text-foreground">3. Perform Action</Label>
                <select
                  id="form-rule-action"
                  value={formAction}
                  onChange={(e) => setFormAction(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                >
                  {ACTIONS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-rule-category" className="font-semibold text-foreground">Category Group</Label>
                <select
                  id="form-rule-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full h-9 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                >
                  <option value="CRM">CRM Data</option>
                  <option value="WhatsApp">WhatsApp Messaging</option>
                  <option value="Files">Files & Folders</option>
                  <option value="Finance">Finance Books</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="text-xs cursor-pointer">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveRule} size="sm" className="text-xs font-semibold bg-primary text-primary-foreground cursor-pointer">
              {editingRule ? "Save Changes" : "Activate Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- OVERLAY PANEL: SIMULATOR TERMINAL CONSOLE --- */}
      {simulatorOpen && simulatorRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-reveal">
          <div className="w-full max-w-xl border border-border shadow-2xl rounded-2xl bg-[#090d16] text-[#e3e8f4] overflow-hidden flex flex-col">
            {/* Console Header Bar */}
            <div className="bg-[#111827] border-b border-border/10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono text-xs font-semibold tracking-tight text-muted-foreground">
                  Automation Test Simulator // <span className="text-emerald-400 font-bold">{simulatorRule.title}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">LIVE SIM</span>
              </div>
            </div>

            {/* Simulated log screen output */}
            <div className="p-5 font-mono text-[10px] space-y-2 h-[260px] overflow-y-auto bg-[#070a10] border-b border-border/10 select-none scrollbar-none flex flex-col justify-end">
              {simulatorLogs.length === 0 && (
                <div className="text-muted-foreground text-center py-10">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-40 text-emerald-400" />
                  Spinning up virtualization context sandbox...
                </div>
              )}
              {simulatorLogs.map((log, index) => (
                <div 
                  key={index}
                  className={`leading-relaxed whitespace-pre-wrap animate-reveal-up ${
                    log.includes("[SUCCESS]") ? "text-emerald-400 font-bold" :
                    log.includes("[TRIGGER]") ? "text-blue-400 font-bold" :
                    log.includes("[EVAL]") ? "text-amber-400" :
                    log.includes("[ERROR]") ? "text-destructive font-bold" : "text-[#93a2b7]"
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>

            {/* Bottom Controls Bar */}
            <div className="bg-[#111827] p-4 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground mb-1.5">
                  <span>Simulation Steps Compiled:</span>
                  <span>{simulatorProgress}%</span>
                </div>
                <div className="w-full bg-muted/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full" 
                    style={{ width: `${simulatorProgress}%` }}
                  />
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  size="sm"
                  disabled={simulatorIsRunning}
                  onClick={() => setSimulatorOpen(false)}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-[#1f2937] disabled:text-muted-foreground text-white font-mono text-[10px] h-8 cursor-pointer"
                >
                  {simulatorIsRunning ? "Running..." : "Exit Sandbox"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvancedAutomationPanel;
