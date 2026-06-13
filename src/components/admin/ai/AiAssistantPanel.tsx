import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Mic, MicOff, Send, Loader2, MessageCircle, FileText,
  CalendarPlus, MapPin, Wallet, BookOpen, Plus, Trash2, ExternalLink, Check,
  History, RotateCcw, X, ChevronRight, ChevronDown, Paperclip, Image as ImageIcon, File as FileIcon,
  Phone, PhoneOff, Volume2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { EXECUTORS, type ExecResult } from "./aiExecutors";
import { useVoiceConversation, type MicDenyReason } from "./useVoiceConversation";
import { MicPermissionDialog } from "./MicPermissionDialog";
import {
  VOICE_LANGUAGES,
  loadVoiceLang,
  saveVoiceLang,
  getVoiceLanguageShort,
  getVoiceLanguageLabel,
} from "./voiceLanguages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "user" | "assistant";
interface Attachment {
  url: string;
  name: string;
  mime: string;
  kind: "image" | "file";
  size?: number;
}
interface ChatMsg {
  role: Role;
  content: string;
  actions?: Action[];
  streaming?: boolean;
  attachments?: Attachment[];
}

type Action =
  | { kind: "whatsapp"; lead_id: string; lead_name?: string; lead_phone?: string; draft_text: string }
  | { kind: "followup"; lead_id: string; lead_name?: string; days_from_now?: number; date_iso?: string; draft_text?: string }
  | { kind: "open_quotation"; lead_id: string; lead_name?: string; url: string }
  | { kind: "site_visit"; lead_id: string; lead_name?: string; date_iso?: string; time_label?: string; draft_text?: string }
  | PendingAction;

// Generic confirm-before-write proposal returned by the edge function.
type PendingAction = {
  kind:
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
  url?: string;
  // runtime-only state appended by the panel after Confirm:
  _state?: "pending" | "running" | "done" | "cancelled" | "error";
  _result?: ExecResult;
};

const PENDING_KINDS = new Set([
  "create_lead","update_lead","delete_lead","update_brand_price","update_pricing_item",
  "create_quotation","transition_quotation","send_quotation","record_payment","add_expense",
  "send_whatsapp","update_company_settings",
  "create_task","assign_task","complete_task","reschedule_task",
  "invite_team_member",
  "create_purchase_order","update_po_status","send_po_to_vendor",
]);

const QUICK_ACTIONS: { label: string; icon: typeof MessageCircle; prompt: string }[] = [
  { label: "Send WhatsApp",    icon: MessageCircle, prompt: "Help me draft a WhatsApp follow-up to one of my recent leads. Show me my 5 most recent leads first so I can pick one." },
  { label: "Draft quotation",  icon: FileText,      prompt: "I want to draft a quotation. Show me my recent leads that don't have a quotation sent yet, then prepare the quotation builder link for the one I pick." },
  { label: "Create site task", icon: MapPin,        prompt: "Help me schedule a site visit for one of my leads. List leads in 'site_visit' or 'negotiation' stage so I can choose." },
  { label: "Schedule visit",   icon: CalendarPlus,  prompt: "Schedule a follow-up visit. Show me leads with overdue follow-ups first." },
  { label: "Email payment link", icon: Wallet,      prompt: "Show me invoices that are unpaid or overdue, and draft a payment reminder for the most overdue one." },
  { label: "Search BOQ",       icon: BookOpen,      prompt: "Help me find a vendor. Ask me what category I'm looking for, then search." },
];

const SUGGESTIONS = [
  "Show me overdue follow-ups",
  "How much money is pending this month?",
  "Pipeline summary",
  "Find a hardware vendor",
];

const HISTORY_KEY = "chirpeel.ai.history.v1";
const THREAD_KEY = "chirpeel.ai.thread.v1";
const MAX_HISTORY = 30;

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function loadThread(): ChatMsg[] {
  try { return JSON.parse(localStorage.getItem(THREAD_KEY) || "[]"); } catch { return []; }
}

// ---- Web Speech API (Chrome/Edge) ----
type SpeechRecCtor = new () => {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
};
function getSpeechRec(): SpeechRecCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AiAssistantPanel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>(() => loadThread());
  const [history, setHistory] = useState<string[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [pending, setPending] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [voiceLang, setVoiceLangState] = useState<string>(() => loadVoiceLang());
  const setVoiceLang = (code: string) => {
    setVoiceLangState(code);
    saveVoiceLang(code);
  };
  const recogRef = useRef<InstanceType<SpeechRecCtor> | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const overlayThreadRef = useRef<HTMLDivElement>(null);
  const overlayInputRef = useRef<HTMLTextAreaElement>(null);
  const inlineInputRef = useRef<HTMLTextAreaElement>(null);
  const inlineFileRef = useRef<HTMLInputElement>(null);
  const overlayFileRef = useRef<HTMLInputElement>(null);

  // Voice conversation mode (hands-free phone-call-style chat)
  const voiceTurnRef = useRef(false); // current send was triggered by voice
  const voice = useVoiceConversation({
    onAutoSend: (text) => {
      voiceTurnRef.current = true;
      void send(text, []);
    },
    silenceMs: 1200,
    lang: voiceLang,
  });

  const [micDialogReason, setMicDialogReason] = useState<MicDenyReason | null>(null);

  const startVoiceMode = async () => {
    if (!voice.supported) {
      setMicDialogReason("unsupported");
      return;
    }
    // Pre-flight: if Permissions API already says "denied", skip getUserMedia
    // and jump straight to the recovery dialog — Chrome will not re-prompt.
    if (voice.permissionState === "denied") {
      setMicDialogReason(window.self !== window.top ? "iframe-blocked" : "denied");
      return;
    }
    if (isMobile && !expanded) setExpanded(true);
    const result = await voice.start();
    if (result.ok === false) {
      setMicDialogReason(result.reason);
    }
  };
  const stopVoiceMode = () => voice.stop();

  const MAX_FILE_MB = 20;
  const MAX_ATTACHMENTS = 5;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    if (pending.length + list.length > MAX_ATTACHMENTS) {
      toast({ title: `Max ${MAX_ATTACHMENTS} attachments per message`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) { toast({ title: "Sign in to attach files", variant: "destructive" }); return; }

      const uploaded: Attachment[] = [];
      for (const f of list) {
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          toast({ title: `${f.name} is over ${MAX_FILE_MB}MB`, variant: "destructive" });
          continue;
        }
        const safeName = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("chat-attachments")
          .upload(path, f, { contentType: f.type || "application/octet-stream", upsert: false });
        if (upErr) {
          toast({ title: `Couldn't upload ${f.name}`, description: upErr.message, variant: "destructive" });
          continue;
        }
        const { data: pub } = supabase.storage.from("chat-attachments").getPublicUrl(path);
        uploaded.push({
          url: pub.publicUrl,
          name: f.name,
          mime: f.type || "application/octet-stream",
          kind: f.type.startsWith("image/") ? "image" : "file",
          size: f.size,
        });
      }
      if (uploaded.length) setPending((p) => [...p, ...uploaded]);
    } finally {
      setUploading(false);
    }
  };

  const removePending = (i: number) => setPending((p) => p.filter((_, idx) => idx !== i));

  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    // Use instant jump on first render / when overlay opens, smooth for subsequent updates
    const behavior: ScrollBehavior = didInitialScrollRef.current ? "smooth" : "auto";
    const scrollBoth = () => {
      if (threadRef.current) {
        threadRef.current.scrollTo({ top: threadRef.current.scrollHeight, behavior });
      }
      if (overlayThreadRef.current) {
        overlayThreadRef.current.scrollTo({ top: overlayThreadRef.current.scrollHeight, behavior });
      }
      didInitialScrollRef.current = true;
    };
    // Wait for layout — overlay/inline thread may have just mounted, so scrollHeight is still 0
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(scrollBoth);
      (scrollBoth as unknown as { _r2?: number })._r2 = r2;
    });
    return () => cancelAnimationFrame(r1);
  }, [messages, busy, expanded]);

  // Reset initial-scroll flag whenever the overlay closes so reopening jumps to bottom again
  useEffect(() => {
    if (!expanded) didInitialScrollRef.current = false;
  }, [expanded]);

  // Body scroll lock + Android back button handling for mobile overlay
  useEffect(() => {
    if (!(isMobile && expanded)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.history.pushState({ chirpeelAiOverlay: true }, "");
    const onPop = () => setExpanded(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    // focus the textarea so the keyboard opens
    const t = setTimeout(() => overlayInputRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
      // pop the history state we pushed, if still present
      if (window.history.state && (window.history.state as { chirpeelAiOverlay?: boolean }).chirpeelAiOverlay) {
        window.history.back();
      }
    };
  }, [isMobile, expanded]);

  useEffect(() => {
    try { localStorage.setItem(THREAD_KEY, JSON.stringify(messages.slice(-50))); } catch { /* noop */ }
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY))); } catch { /* noop */ }
  }, [history]);

  const send = async (text: string, attachmentsOverride?: Attachment[]) => {
    const trimmed = text.trim();
    const atts = attachmentsOverride ?? pending;
    if ((!trimmed && atts.length === 0) || busy) return;
    const userText = trimmed || (atts.length ? `Please review the attached ${atts.length === 1 ? atts[0].kind : "files"}.` : "");
    const next: ChatMsg[] = [...messages, { role: "user", content: userText, attachments: atts.length ? atts : undefined }];
    setMessages(next);
    if (trimmed) setHistory((h) => [trimmed, ...h.filter((q) => q !== trimmed)].slice(0, MAX_HISTORY));
    setInput("");
    setPending([]);
    setBusy(true);
    const wasVoiceTurn = voiceTurnRef.current;
    voiceTurnRef.current = false;
    if (wasVoiceTurn) voice.setThinking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-ai-chat?stream=1`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: next.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          voice_mode: wasVoiceTurn,
        }),
      });

      if (!resp.ok || !resp.body) {
        let serverMsg = "";
        try { serverMsg = (await resp.json())?.error ?? ""; } catch { /* noop */ }
        const msg =
          resp.status === 429 ? "Hit the AI rate limit. Try again in a few seconds."
          : resp.status === 402 ? "AI credits ran out. Top up in Settings → Workspace → Usage."
          : serverMsg || "Assistant failed.";
        toast({ title: "Assistant error", description: msg, variant: "destructive" });
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
        return;
      }

      // Push an empty assistant placeholder we will append to.
      setMessages((m) => [...m, { role: "assistant", content: "", streaming: true }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let finalActions: Action[] = [];
      let done = false;

      const flushAssistant = (content: string, actions?: Action[], stillStreaming = true) => {
        setMessages((m) => {
          const copy = m.slice();
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i].role === "assistant") {
              copy[i] = { ...copy[i], content, actions: actions ?? copy[i].actions, streaming: stillStreaming };
              break;
            }
          }
          return copy;
        });
      };

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(payload) as { delta?: string; actions?: Action[]; error?: string };
            if (parsed.error) {
              toast({ title: "Assistant error", description: parsed.error, variant: "destructive" });
            }
            if (parsed.delta) {
              acc += parsed.delta;
              flushAssistant(acc);
            }
            if (parsed.actions) {
              finalActions = parsed.actions;
            }
          } catch { /* partial JSON — wait for more */ }
        }
      }

      flushAssistant(acc || "I couldn't form a reply — try rephrasing.", finalActions, false);
      if (wasVoiceTurn && voice.active) {
        // Friendly voice reply, then auto-reopen the mic.
        void voice.speakAndResume(acc || "I couldn't form a reply — try rephrasing.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      toast({ title: "Assistant error", description: msg, variant: "destructive" });
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  const removeHistory = (q: string) => setHistory((h) => h.filter((x) => x !== q));
  const clearAll = () => {
    setMessages([]);
    setHistoryOpen(false);
  };

  const toggleMic = () => {
    const Ctor = getSpeechRec();
    if (!Ctor) {
      toast({ title: "Voice input unavailable", description: "Use Chrome or Edge for mic input." });
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = false; rec.interimResults = false; rec.lang = voiceLang;
    rec.onresult = (e) => {
      const t = e.results?.[0]?.[0]?.transcript;
      if (t) setInput((prev) => (prev ? prev + " " : "") + t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recogRef.current = rec;
    rec.start();
    setListening(true);
  };

  // ---- Action handlers ----
  const runWhatsApp = (a: Extract<Action, { kind: "whatsapp" }>) => {
    const phone = (a.lead_phone || "").replace(/\D/g, "");
    if (!phone) { toast({ title: "No phone on file for this lead", variant: "destructive" }); return; }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(a.draft_text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const runFollowup = async (a: Extract<Action, { kind: "followup" }>) => {
    if (!a.date_iso) return;
    const { error } = await supabase.from("lead_follow_ups").insert({
      lead_id: a.lead_id,
      follow_up_date: new Date(`${a.date_iso}T10:00:00`).toISOString(),
      note: a.draft_text ?? "",
    });
    if (error) toast({ title: "Couldn't schedule", description: error.message, variant: "destructive" });
    else toast({ title: "Follow-up scheduled", description: `${a.lead_name ?? "Lead"} on ${a.date_iso}` });
  };

  const runQuotation = (a: Extract<Action, { kind: "open_quotation" }>) => {
    navigate(a.url);
  };

  const runSiteVisit = async (a: Extract<Action, { kind: "site_visit" }>) => {
    if (!a.date_iso) return;
    const { error } = await supabase.from("lead_follow_ups").insert({
      lead_id: a.lead_id,
      follow_up_date: new Date(`${a.date_iso}T${(a.time_label || "10:00 AM").includes("PM") ? "14:00:00" : "10:00:00"}`).toISOString(),
      note: `Site visit ${a.time_label ? `at ${a.time_label}` : ""}`.trim(),
    });
    if (error) toast({ title: "Couldn't create site visit", description: error.message, variant: "destructive" });
    else toast({ title: "Site visit scheduled", description: `${a.lead_name ?? "Lead"} on ${a.date_iso}` });
  };

  // Mutate one action inside one message immutably.
  const updateAction = (msgIndex: number, actionIndex: number, patch: Partial<PendingAction>) => {
    setMessages((prev) => {
      const copy = prev.slice();
      const msg = copy[msgIndex];
      if (!msg?.actions) return prev;
      const acts = msg.actions.slice();
      const cur = acts[actionIndex] as PendingAction;
      acts[actionIndex] = { ...cur, ...patch } as Action;
      copy[msgIndex] = { ...msg, actions: acts };
      return copy;
    });
  };

  const runPending = async (a: PendingAction, msgIndex: number, actionIndex: number) => {
    const exec = EXECUTORS[a.kind];
    if (!exec) { toast({ title: "Unknown action", variant: "destructive" }); return; }
    if (a.destructive) {
      const ok = window.confirm(`Confirm: ${a.title}\n\n${a.summary ?? ""}\n\nThis will write to your live data.`);
      if (!ok) return;
    }
    updateAction(msgIndex, actionIndex, { _state: "running" });
    try {
      const result: ExecResult = await exec(a.payload ?? {});
      if (result.ok === true) {
        updateAction(msgIndex, actionIndex, { _state: "done", _result: result });
        toast({ title: result.message });
        window.dispatchEvent(new CustomEvent("chirpeel:data-changed", { detail: { kind: a.kind } }));
        // Feed the success back into the conversation history so the next AI turn
        // knows the write actually landed (and what id was returned). Without this,
        // the assistant has no way to recover an id from a "propose_*" card and
        // will sometimes claim "not found" on follow-up requests.
        const idMatch = /lead=([0-9a-f-]{36})|quotation=([0-9a-f-]{36})|task=([0-9a-f-]{36})/i.exec(result.href ?? "");
        const recordId = idMatch?.[1] || idMatch?.[2] || idMatch?.[3] || "";
        const note = `[system] ${a.kind} confirmed — ${result.message}${recordId ? ` (id=${recordId})` : ""}. The user has approved this action; the database now reflects it. If you need to reference this record later, use the id above and re-run the relevant search tool to fetch fresh data.`;
        setMessages((m) => [...m, { role: "assistant", content: note }]);
      } else {
        updateAction(msgIndex, actionIndex, { _state: "error", _result: result });
        toast({ title: "Action failed", description: result.error, variant: "destructive" });
        setMessages((m) => [...m, { role: "assistant", content: `[system] ${a.kind} FAILED — ${result.error}. Apologise to the user and suggest a fix.` }]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      updateAction(msgIndex, actionIndex, { _state: "error", _result: { ok: false, error: msg } });
      toast({ title: "Action failed", description: msg, variant: "destructive" });
    }
  };

  const cancelPending = (msgIndex: number, actionIndex: number) =>
    updateAction(msgIndex, actionIndex, { _state: "cancelled" });

  const renderAction = (a: Action, idx: number) => {
    // PendingAction (any of the propose_* outputs) → unified confirm card.
    if (PENDING_KINDS.has(a.kind)) {
      // We need msgIndex too; renderAction is called from .map below — patch the call sites
      // to pass msgIndex. For now, locate the message containing this action ref.
      const msgIndex = messages.findIndex((m) => m.actions?.includes(a));
      const actionIndex = msgIndex >= 0 ? messages[msgIndex].actions!.indexOf(a) : -1;
      const p = a as PendingAction;
      const state = p._state ?? "pending";
      const tone = p.destructive
        ? "border-destructive/40 bg-destructive/5"
        : "border-primary/30 bg-primary/5";
      return (
        <div key={idx} className={`rounded-lg border ${tone} p-2.5`}>
          <div className={`text-[11px] uppercase tracking-wide font-semibold mb-1 ${p.destructive ? "text-destructive" : "text-primary"}`}>
            {p.title ?? "Pending action"} {p.destructive && <span className="ml-1">·  destructive</span>}
          </div>
          {p.summary && <div className="text-xs text-muted-foreground mb-2">{p.summary}</div>}
          {p.fields && p.fields.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px] mb-2">
              {p.fields.map((row, i) => (
                <div key={i} className="contents">
                  <dt className="text-muted-foreground capitalize">{row.label.replace(/_/g, " ")}</dt>
                  <dd className="font-medium break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {state === "pending" && (
            <div className="flex items-center gap-2 mt-1">
              <Button
                size="sm"
                variant={p.destructive ? "destructive" : "default"}
                onClick={() => runPending(p, msgIndex, actionIndex)}
                className="h-7 text-xs"
              >
                <Check className="w-3 h-3 mr-1" /> Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => cancelPending(msgIndex, actionIndex)} className="h-7 text-xs">
                <X className="w-3 h-3 mr-1" /> Cancel
              </Button>
            </div>
          )}
          {state === "running" && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Running…
            </div>
          )}
          {state === "done" && p._result && p._result.ok && (
            <div className="flex items-center gap-2 text-[11px] text-green-700 dark:text-green-400">
              <Check className="w-3 h-3" /> {p._result.message}
              {"href" in p._result && p._result.href && (
                <button
                  type="button"
                  onClick={() => navigate((p._result as { href: string }).href)}
                  className="inline-flex items-center gap-1 underline ml-1"
                >
                  Open <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          {state === "error" && p._result && p._result.ok === false && (
            <div className="text-[11px] text-destructive">⚠️ {p._result.error}</div>
          )}
          {state === "cancelled" && (
            <div className="text-[11px] text-muted-foreground">Cancelled.</div>
          )}
        </div>
      );
    }

    switch (a.kind) {
      case "whatsapp":
        return (
          <ActionCard key={idx} title={`WhatsApp draft for ${a.lead_name ?? "lead"}`} sub={a.lead_phone}>
            <pre className="text-xs whitespace-pre-wrap font-sans bg-muted/60 rounded p-2 mb-2">{a.draft_text}</pre>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => runWhatsApp(a)} className="h-7 text-xs">
                <Send className="w-3 h-3 mr-1" /> Open WhatsApp
              </Button>
              <Button size="sm" variant="outline" onClick={() => runWhatsApp(a)} className="h-7 text-xs">
                <RotateCcw className="w-3 h-3 mr-1" /> Re-run action
              </Button>
            </div>
          </ActionCard>
        );
      case "followup":
        return (
          <ActionCard key={idx} title={`Schedule follow-up — ${a.lead_name ?? "lead"}`} sub={a.date_iso}>
            {a.draft_text && <p className="text-xs text-muted-foreground mb-2">{a.draft_text}</p>}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => runFollowup(a)} className="h-7 text-xs">
                <Check className="w-3 h-3 mr-1" /> Confirm schedule
              </Button>
              <Button size="sm" variant="outline" onClick={() => runFollowup(a)} className="h-7 text-xs">
                <RotateCcw className="w-3 h-3 mr-1" /> Re-run action
              </Button>
            </div>
          </ActionCard>
        );
      case "open_quotation":
        return (
          <ActionCard key={idx} title={`Quotation for ${a.lead_name ?? "lead"}`}>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => runQuotation(a)} className="h-7 text-xs">
                <ExternalLink className="w-3 h-3 mr-1" /> Open quotation builder
              </Button>
              <Button size="sm" variant="outline" onClick={() => runQuotation(a)} className="h-7 text-xs">
                <RotateCcw className="w-3 h-3 mr-1" /> Re-run action
              </Button>
            </div>
          </ActionCard>
        );
      case "site_visit":
        return (
          <ActionCard key={idx} title={`Site visit — ${a.lead_name ?? "lead"}`} sub={`${a.date_iso ?? ""} ${a.time_label ?? ""}`.trim()}>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => runSiteVisit(a)} className="h-7 text-xs">
                <Check className="w-3 h-3 mr-1" /> Confirm site visit
              </Button>
              <Button size="sm" variant="outline" onClick={() => runSiteVisit(a)} className="h-7 text-xs">
                <RotateCcw className="w-3 h-3 mr-1" /> Re-run action
              </Button>
            </div>
          </ActionCard>
        );
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const openOverlay = () => { if (isMobile) setExpanded(true); };
  const closeOverlay = () => setExpanded(false);
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  // ---- Render helpers ----
  const renderMessage = (m: ChatMsg, i: number) => (
    <motion.div
      key={i}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={m.role === "user" ? "flex justify-end" : ""}
    >
      <div
        className={
          m.role === "user"
            ? "max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-sm"
            : "max-w-[95%] text-sm"
        }
      >
        {m.role === "assistant" ? (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1 dark:prose-invert">
            {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : <TypingDots />}
            {m.streaming && m.content && <span className="inline-block w-1.5 h-3.5 -mb-0.5 ml-0.5 bg-primary/70 align-middle animate-pulse rounded-sm" />}
          </div>
        ) : (
          <div className="space-y-1">
            {m.attachments && m.attachments.length > 0 && (
              <AttachmentPreview attachments={m.attachments} onMessage />
            )}
            <div>{m.content}</div>
            <button
              type="button"
              onClick={() => send(m.content)}
              disabled={busy}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-70 hover:opacity-100 disabled:opacity-40 cursor-pointer"
              aria-label="Re-run this query"
            >
              <RotateCcw className="w-3 h-3" /> Re-run
            </button>
          </div>
        )}
        {m.actions && m.actions.length > 0 && (
          <div className="mt-2 space-y-2">{m.actions.map(renderAction)}</div>
        )}
      </div>
    </motion.div>
  );

  const pendingStrip = pending.length === 0 && !uploading ? null : (
    <div className="flex items-center gap-1.5 flex-wrap mb-2">
      {pending.map((a, i) => (
        <div
          key={i}
          className="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-lg bg-muted/60 border border-border text-[11px] max-w-[220px]"
        >
          {a.kind === "image" ? (
            <img src={a.url} alt={a.name} className="w-7 h-7 rounded object-cover" />
          ) : (
            <span className="w-7 h-7 rounded bg-background border border-border flex items-center justify-center">
              <FileIcon className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
          )}
          <span className="truncate max-w-[140px]">{a.name}</span>
          <button
            type="button"
            onClick={() => removePending(i)}
            className="text-muted-foreground hover:text-destructive p-0.5"
            aria-label={`Remove ${a.name}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {uploading && (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
        </span>
      )}
    </div>
  );

  const quickActionGrid = (compact = false) => (
    <div className={`grid ${compact ? "grid-cols-3 gap-1.5" : "grid-cols-2 sm:grid-cols-3 gap-2"}`}>
      {QUICK_ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.label}
            type="button"
            onClick={() => { setShowQuickActions(false); send(a.prompt); }}
            disabled={busy}
            className={`flex items-center gap-2 ${compact ? "px-2 py-1.5 text-[11px]" : "px-3 py-2 text-xs"} rounded-lg border border-border bg-background hover:bg-accent hover:border-primary/40 transition-colors text-left disabled:opacity-50 cursor-pointer`}
          >
            <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{a.label}</span>
          </button>
        );
      })}
    </div>
  );

  const suggestionChips = (
    <div className="flex items-center gap-2 flex-wrap">
      <Plus className="w-3 h-3 text-muted-foreground" />
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => send(s)}
          disabled={busy}
          className="px-2 py-0.5 rounded text-[11px] bg-accent text-accent-foreground hover:opacity-80 disabled:opacity-50 cursor-pointer"
        >
          {s}
        </button>
      ))}
    </div>
  );

  // ============ MOBILE OVERLAY ============
  const overlay = (isMobile && expanded) ? createPortal(
    <AnimatePresence>
      <motion.div
        key="ai-overlay"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-0 z-[60] bg-background flex flex-col"
        style={{ height: "100dvh" }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Chirpeel AI</div>
              <div className="text-[10px] text-muted-foreground">{busy ? "Thinking…" : "Ready to help"}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground"
              aria-label="History"
            >
              <History className="w-4 h-4" />
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="p-2 rounded-md hover:bg-accent text-muted-foreground"
                aria-label="Clear thread"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={closeOverlay}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body / Thread */}
        <div ref={overlayThreadRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-1">Ask Chirpeel AI anything</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                Draft messages, schedule visits, find leads, or summarize your pipeline — just type below.
              </p>
              <div className="w-full max-w-sm space-y-2">
                {quickActionGrid(false)}
              </div>
            </div>
          ) : (
            <>
              {messages.map(renderMessage)}
              {busy && !voice.active && !messages.some((m) => m.role === "assistant" && m.streaming) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TypingDots /> <span>Chirpeel AI is thinking…</span>
                </div>
              )}
              {voice.active && (
                <VoiceLiveBubble state={voice.state} text={voice.liveTranscript} />
              )}
            </>
          )}

          {/* History dropdown */}
          <AnimatePresence>
            {historyOpen && (
              <>
                <motion.div
                  key="hbd"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-background/40 backdrop-blur-sm"
                  onClick={() => setHistoryOpen(false)}
                />
                <motion.div
                  key="hpanel"
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-3 right-3 top-2 rounded-xl border border-border bg-popover shadow-lg p-2 max-h-[60dvh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <span className="text-xs font-semibold">History</span>
                    <button onClick={() => setHistoryOpen(false)} className="text-muted-foreground p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {history.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-3">No past queries yet.</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {history.map((q) => (
                        <li key={q} className="flex items-center gap-1 group">
                          <button
                            type="button"
                            onClick={() => { setHistoryOpen(false); send(q); }}
                            disabled={busy}
                            className="flex-1 flex items-center gap-2 text-left text-xs px-2 py-2 rounded hover:bg-accent disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3 text-primary shrink-0" />
                            <span className="truncate">{q}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeHistory(q)}
                            className="text-muted-foreground hover:text-destructive p-1.5"
                            aria-label="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                      <li className="pt-1 px-2">
                        <button
                          type="button"
                          onClick={() => setHistory([])}
                          className="text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          Clear all history
                        </button>
                      </li>
                    </ul>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Quick actions strip (when thread has messages) */}
        {messages.length > 0 && (
          <div className="shrink-0 px-3 pt-2 border-t border-border bg-background">
            <button
              type="button"
              onClick={() => setShowQuickActions((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {showQuickActions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Quick actions
            </button>
            <AnimatePresence initial={false}>
              {showQuickActions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2"
                >
                  {quickActionGrid(true)}
                  <div className="mt-2">{suggestionChips}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Composer */}
        <div
          className="shrink-0 border-t border-border bg-background px-3 pt-2"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
        >
          <input
            ref={overlayFileRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />
          {pendingStrip}
          <div className="flex items-end gap-2">
            <Sparkles className="w-4 h-4 text-primary mb-3 shrink-0" />
            <button
              type="button"
              onClick={() => overlayFileRef.current?.click()}
              disabled={uploading || busy || pending.length >= MAX_ATTACHMENTS}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 disabled:opacity-40"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              ref={overlayInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask Chirpeel AI anything…"
              rows={1}
              className="flex-1 bg-muted/40 rounded-2xl px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground resize-none min-h-[40px] max-h-[40dvh] focus:bg-muted/60"
            />
            <button
              type="button"
              onClick={toggleMic}
              className={`p-2 rounded-full transition-colors shrink-0 ${listening ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Voice input"
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <Select value={voiceLang} onValueChange={setVoiceLang}>
              <SelectTrigger
                className="h-8 w-auto min-w-[60px] px-2 text-xs rounded-full border-border/60 bg-muted/40 hover:bg-muted/60 shrink-0 gap-1"
                title={`Voice language: ${getVoiceLanguageLabel(voiceLang)}`}
                aria-label="Voice input language"
              >
                <SelectValue>{getVoiceLanguageShort(voiceLang)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {VOICE_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-sm">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={voice.active ? stopVoiceMode : startVoiceMode}
              className={`relative p-2 rounded-full transition-colors shrink-0 ${voice.active ? "text-destructive bg-destructive/10 animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={voice.active ? "End voice conversation" : "Start voice conversation"}
              title={
                voice.active
                  ? "End voice conversation"
                  : voice.permissionState === "denied"
                  ? "Microphone blocked — tap to fix"
                  : "Talk hands-free"
              }
            >
              {voice.active ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              {!voice.active && voice.permissionState === "denied" && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </button>
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={busy || uploading || (!input.trim() && pending.length === 0)}
              className="h-10 w-10 rounded-full shrink-0"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  ) : null;

  // ============ INLINE (mobile collapsed preview) ============
  if (isMobile && !expanded) {
    return (
      <>
        <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
          {/* History bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <button
              type="button"
              onClick={() => { setExpanded(true); setTimeout(() => setHistoryOpen(true), 350); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground"
            >
              <History className="w-3.5 h-3.5" />
              History {history.length > 0 && <span className="text-muted-foreground">({history.length})</span>}
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Tap-to-expand input */}
          <div className="p-4">
            <button
              type="button"
              onClick={openOverlay}
              className="w-full flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span className="flex-1 text-sm text-muted-foreground truncate">
                {lastAssistant ? "Continue your chat…" : "Ask Chirpeel AI anything…"}
              </span>
              <Send className="w-4 h-4 text-primary shrink-0" />
            </button>

            {lastAssistant && (
              <button
                type="button"
                onClick={openOverlay}
                className="mt-2 w-full text-left rounded-lg bg-accent/40 px-3 py-2 text-xs text-muted-foreground line-clamp-2 hover:bg-accent/60"
              >
                <span className="font-medium text-foreground">Last reply: </span>
                {lastAssistant.content.replace(/[*_`#>]/g, "").slice(0, 140)}
              </button>
            )}

            {/* Quick action grid */}
            <div className="mt-3">{quickActionGrid(false)}</div>

            {/* Suggested chips */}
            <div className="mt-2">{suggestionChips}</div>
          </div>
        </div>
        {overlay}
      </>
    );
  }

  // ============ DESKTOP / ORIGINAL LAYOUT ============
  return (
    <>
    <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
      {/* History bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary cursor-pointer"
        >
          <History className="w-3.5 h-3.5" />
          History {history.length > 0 && <span className="text-muted-foreground">({history.length})</span>}
        </button>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> Clear thread
          </button>
        )}
      </div>

      {historyOpen && (
        <div className="px-4 py-2 border-b border-border bg-background max-h-56 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No past queries yet. Ask anything to start building your history.</p>
          ) : (
            <ul className="space-y-1">
              {history.map((q) => (
                <li key={q} className="flex items-center gap-2 group">
                  <button
                    type="button"
                    onClick={() => { setHistoryOpen(false); send(q); }}
                    disabled={busy}
                    className="flex-1 flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded hover:bg-accent disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">{q}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeHistory(q)}
                    aria-label="Remove from history"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
              <li className="pt-1">
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  Clear all history
                </button>
              </li>
            </ul>
          )}
        </div>
      )}

      {/* Thread */}
      {messages.length > 0 && (
        <div ref={threadRef} className="max-h-[420px] overflow-y-auto px-4 pt-4 space-y-3 border-b border-border">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-sm"
                    : "max-w-[95%] text-sm"
                }
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1 dark:prose-invert">
                    {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : <TypingDots />}
                    {m.streaming && m.content && <span className="inline-block w-1.5 h-3.5 -mb-0.5 ml-0.5 bg-primary/70 align-middle animate-pulse rounded-sm" />}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {m.attachments && m.attachments.length > 0 && (
                      <AttachmentPreview attachments={m.attachments} onMessage />
                    )}
                    <div>{m.content}</div>
                    <button
                      type="button"
                      onClick={() => send(m.content)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-70 hover:opacity-100 disabled:opacity-40 cursor-pointer"
                      aria-label="Re-run this query"
                    >
                      <RotateCcw className="w-3 h-3" /> Re-run
                    </button>
                  </div>
                )}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 space-y-2">{m.actions.map(renderAction)}</div>
                )}
              </div>
            </div>
          ))}
          {busy && !voice.active && !messages.some((m) => m.role === "assistant" && m.streaming) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TypingDots /> <span>Chirpeel AI is thinking…</span>
            </div>
          )}
          {voice.active && (
            <VoiceLiveBubble state={voice.state} text={voice.liveTranscript} />
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-4">
        <input
          ref={inlineFileRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
        {pendingStrip}
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-primary mt-2 shrink-0" />
          <button
            type="button"
            onClick={() => inlineFileRef.current?.click()}
            disabled={uploading || busy || pending.length >= MAX_ATTACHMENTS}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40"
            aria-label="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            ref={inlineInputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Chirpeel AI anything…"
            rows={1}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground resize-none min-h-[24px] max-h-32"
          />
          <button
            type="button"
            onClick={toggleMic}
            className={`p-1.5 rounded transition-colors ${listening ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Voice input"
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <Select value={voiceLang} onValueChange={setVoiceLang}>
            <SelectTrigger
              className="h-7 w-auto min-w-[52px] px-2 text-[11px] rounded-md border-border/60 bg-muted/30 hover:bg-muted/50 shrink-0 gap-1"
              title={`Voice language: ${getVoiceLanguageLabel(voiceLang)}`}
              aria-label="Voice input language"
            >
              <SelectValue>{getVoiceLanguageShort(voiceLang)}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {VOICE_LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code} className="text-sm">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={voice.active ? stopVoiceMode : startVoiceMode}
            className={`relative p-1.5 rounded transition-colors ${voice.active ? "text-destructive bg-destructive/10 animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
            aria-label={voice.active ? "End voice conversation" : "Start voice conversation"}
            title={
              voice.active
                ? "End voice conversation"
                : voice.permissionState === "denied"
                ? "Microphone blocked — tap to fix"
                : "Talk hands-free"
            }
          >
            {voice.active ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            {!voice.active && voice.permissionState === "denied" && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </button>
          <Button
            size="sm"
            onClick={() => send(input)}
            disabled={busy || uploading || (!input.trim() && pending.length === 0)}
            className="h-8"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </Button>
        </div>

        {/* Action grid (mirrors screenshot 2) */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                type="button"
                onClick={() => send(a.prompt)}
                disabled={busy}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent hover:border-primary/40 transition-colors text-xs text-left disabled:opacity-50 cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{a.label}</span>
              </button>
            );
          })}
        </div>

        {/* Suggested chips + clear */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Plus className="w-3 h-3 text-muted-foreground" />
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={busy}
              className="px-2 py-0.5 rounded text-[11px] bg-accent text-accent-foreground hover:opacity-80 disabled:opacity-50 cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
    {overlay}
    <MicPermissionDialog
      open={micDialogReason !== null}
      reason={micDialogReason}
      onClose={() => setMicDialogReason(null)}
      onRetry={() => {
        setMicDialogReason(null);
        void startVoiceMode();
      }}
    />
    </>
  );
}

function ActionCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
      <div className="text-[11px] uppercase tracking-wide font-semibold text-primary mb-0.5">{title}</div>
      {sub && <div className="text-[11px] text-muted-foreground mb-1.5">{sub}</div>}
      {children}
    </div>
  );
}

export default AiAssistantPanel;

function TypingDots() {
  return (
    <span
      className="inline-flex items-end gap-1 align-middle"
      role="status"
      aria-label="Assistant is typing"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-primary/70"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

function VoiceLiveBubble({ state, text }: { state: "idle" | "listening" | "thinking" | "speaking"; text: string }) {
  const label =
    state === "speaking" ? "Chirpeel AI is speaking…"
    : state === "thinking" ? "Thinking…"
    : text ? "" : "Listening…";
  const isUserSide = !!text || state === "listening" || state === "idle";
  return (
    <div className={isUserSide ? "flex justify-end" : ""}>
      <div
        className={
          isUserSide
            ? "max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm border border-primary/40 bg-primary/10 text-foreground"
            : "max-w-[95%] text-sm text-muted-foreground"
        }
      >
        <div className="flex items-center gap-2">
          {state === "speaking" ? (
            <Volume2 className="w-3.5 h-3.5 text-primary animate-pulse" />
          ) : state === "thinking" ? (
            <TypingDots />
          ) : (
            <span className="relative inline-flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-destructive" />
            </span>
          )}
          <span className={text ? "" : "italic opacity-70"}>{text || label}</span>
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({
  attachments,
  onMessage = false,
}: {
  attachments: Attachment[];
  onMessage?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {attachments.map((a, i) =>
        a.kind === "image" ? (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg overflow-hidden border border-border/40"
            title={a.name}
          >
            <img src={a.url} alt={a.name} className="w-24 h-24 object-cover" loading="lazy" />
          </a>
        ) : (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] max-w-[220px] ${
              onMessage ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted/60 hover:bg-muted"
            }`}
            title={a.name}
          >
            <FileIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span className="truncate">{a.name}</span>
            <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
          </a>
        ),
      )}
    </div>
  );
}
