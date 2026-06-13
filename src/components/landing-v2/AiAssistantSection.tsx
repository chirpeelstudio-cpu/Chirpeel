import { useEffect, useState } from "react";
import { Sparkles, Send, FileText, CheckSquare, Search, Mail, Calendar, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SkyBackdrop from "./SkyBackdrop";

const ACTIONS = [
  { icon: Send, label: "Send WhatsApp" },
  { icon: FileText, label: "Draft quotation" },
  { icon: CheckSquare, label: "Create site task" },
  { icon: Calendar, label: "Schedule visit" },
  { icon: Mail, label: "Email payment link" },
  { icon: Search, label: "Search BOQ" },
];

/** Typewriter that cycles through phrases. */
function useTypewriter(phrases: string[], opts?: { typeMs?: number; holdMs?: number; eraseMs?: number; startDelay?: number }) {
  const typeMs = opts?.typeMs ?? 55;
  const holdMs = opts?.holdMs ?? 1600;
  const eraseMs = opts?.eraseMs ?? 28;
  const startDelay = opts?.startDelay ?? 0;

  const [text, setText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phase, setPhase] = useState<"idle" | "typing" | "holding" | "erasing">("idle");

  useEffect(() => {
    const t = setTimeout(() => setPhase("typing"), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  useEffect(() => {
    if (phase === "idle") return;
    const current = phrases[phraseIdx];
    let timer: number | undefined;

    if (phase === "typing") {
      if (text.length < current.length) {
        timer = window.setTimeout(() => setText(current.slice(0, text.length + 1)), typeMs);
      } else {
        timer = window.setTimeout(() => setPhase("holding"), holdMs);
      }
    } else if (phase === "holding") {
      timer = window.setTimeout(() => setPhase("erasing"), holdMs);
    } else if (phase === "erasing") {
      if (text.length > 0) {
        timer = window.setTimeout(() => setText(text.slice(0, -1)), eraseMs);
      } else {
        setPhraseIdx((i) => (i + 1) % phrases.length);
        setPhase("typing");
      }
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [text, phase, phraseIdx, phrases, typeMs, holdMs, eraseMs]);

  return { text, phraseIdx, isTyping: phase === "typing", isHolding: phase === "holding" };
}

const Caret = () => (
  <span className="inline-block w-[1.5px] h-[0.95em] align-middle bg-primary ml-0.5 animate-pulse" />
);

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-background/95 backdrop-blur border border-foreground/10 shadow-xl p-6 md:p-8">
      {children}
    </div>
  );
}

// === Card 1: Actions ===
const CARD1_PHRASES = [
  "Send Karthik the revised quote",
  "Schedule site visit for Meera",
  "Draft BOQ for Pollachi villa",
];
function ActionsCard() {
  const { text, phraseIdx, isHolding } = useTypewriter(CARD1_PHRASES, { startDelay: 300 });
  // Highlight a different action per phrase
  const highlightIdx = phraseIdx % ACTIONS.length;

  return (
    <Card>
      <div className="rounded-2xl bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-[12px] mb-3 min-h-[18px]">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-foreground font-medium">
            {text || <span className="text-muted-foreground">Ask anything…</span>}
            <Caret />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ACTIONS.map((a, i) => {
            const active = isHolding && i === highlightIdx;
            return (
              <motion.div
                key={a.label}
                animate={active ? { scale: 1.04 } : { scale: 1 }}
                transition={{ duration: 0.25 }}
                className={`flex items-center gap-1.5 text-[11px] rounded-lg px-2 py-1.5 transition-colors ${
                  active
                    ? "bg-primary/10 border border-primary text-foreground"
                    : "bg-background border border-border"
                }`}
              >
                <a.icon className={`w-3.5 h-3.5 ${active ? "text-primary" : "text-primary"}`} /> {a.label}
              </motion.div>
            );
          })}
        </div>
      </div>
      <p className="mt-5 text-base">
        <strong className="font-bold">Takes actions for you</strong>{" "}
        <span className="text-foreground/70">— send WhatsApp, draft quotations, raise vendor POs and schedule site visits without lifting a finger.</span>
      </p>
    </Card>
  );
}

// === Card 2: Search ===
const CARD2_QUERIES: { q: string; results: { title: string; sub: string }[] }[] = [
  {
    q: "What did Karthik say about Hettich?",
    results: [
      { title: "Karthik R · Pollachi villa", sub: "\"Yes, Hettich slow-close is fine. Please confirm laminate brand.\"" },
      { title: "Quotation HC-2026-0042", sub: "Hardware: Hettich · Total ₹8.1L" },
    ],
  },
  {
    q: "Show me unpaid invoices over ₹2L",
    results: [
      { title: "INV-227 · Priya R.", sub: "₹4,50,000 · 12 days overdue" },
      { title: "INV-219 · Suresh M.", sub: "₹2,80,000 · pending approval" },
    ],
  },
  {
    q: "Pollachi villa — site photos",
    results: [
      { title: "Pollachi villa · Phase 2", sub: "12 photos uploaded by Karan S. · 2h ago" },
      { title: "Milestone — Carcass install", sub: "62% complete · client approved" },
    ],
  },
];
function SearchCard() {
  const phrases = CARD2_QUERIES.map((c) => c.q);
  const { text, phraseIdx, isHolding } = useTypewriter(phrases, { startDelay: 900, typeMs: 45 });
  const current = CARD2_QUERIES[phraseIdx];

  return (
    <Card>
      <div className="rounded-2xl bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-[12px] mb-2 min-h-[18px]">
          <Search className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-semibold">
            {text}
            <Caret />
          </span>
        </div>
        <div className="space-y-1.5 min-h-[88px]">
          <AnimatePresence mode="wait">
            {isHolding && (
              <motion.div
                key={phraseIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="space-y-1.5"
              >
                {current.results.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.25 }}
                    className="bg-background border border-border rounded-lg p-2 text-[11px]"
                  >
                    <div className="font-semibold">{r.title}</div>
                    <div className="text-muted-foreground">{r.sub}</div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-5 text-base">
        <strong className="font-bold">Finds anything</strong>{" "}
        <span className="text-foreground/70">— natural-language search across leads, quotations, vendor POs and project notes.</span>
      </p>
    </Card>
  );
}

// === Card 3: Auto-update activity feed ===
const ACTIVITY_ITEMS = [
  { title: "Site visit · Bengaluru duplex", sub: "Auto-logged from calendar", badge: "Updated" as const },
  { title: "Stage moved → Quotation", sub: "Karthik R · 2m ago", badge: "arrow" as const },
  { title: "Vendor PO #118 · Approved", sub: "Synced to Tally", badge: "check" as const },
  { title: "Payment received · ₹1.2L", sub: "Razorpay · auto-reconciled", badge: "Updated" as const },
  { title: "Invoice INV-229 · Sent", sub: "Email + WhatsApp delivered", badge: "check" as const },
];
function AutoUpdateCard() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [startIdx, setStartIdx] = useState(0);

  useEffect(() => {
    const start = setTimeout(() => setVisibleCount(1), 500);
    return () => clearTimeout(start);
  }, []);

  useEffect(() => {
    if (visibleCount === 0) return;
    if (visibleCount < 3) {
      const t = setTimeout(() => setVisibleCount((c) => c + 1), 900);
      return () => clearTimeout(t);
    }
    // Hold, then rotate the window forward by 1
    const t = setTimeout(() => {
      setStartIdx((i) => (i + 1) % ACTIVITY_ITEMS.length);
      setVisibleCount(2); // smooth slide: drop oldest, then add a new one
    }, 2400);
    return () => clearTimeout(t);
  }, [visibleCount]);

  const items = Array.from({ length: visibleCount }, (_, i) => ACTIVITY_ITEMS[(startIdx + i) % ACTIVITY_ITEMS.length]);

  return (
    <Card>
      <div className="rounded-2xl bg-muted/40 p-3 space-y-2 text-[11px] min-h-[140px]">
        <AnimatePresence initial={false}>
          {items.map((it, i) => (
            <motion.div
              key={`${startIdx}-${i}`}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex items-center justify-between bg-background border border-border rounded-lg p-2"
            >
              <div>
                <div className="font-semibold">{it.title}</div>
                <div className="text-muted-foreground">{it.sub}</div>
              </div>
              {it.badge === "Updated" && <span className="text-[9px] font-bold text-primary">Updated</span>}
              {it.badge === "arrow" && <ArrowRight className="w-3 h-3 text-primary" />}
              {it.badge === "check" && <span className="text-[9px] font-bold text-primary">✓</span>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="mt-5 text-base">
        <strong className="font-bold">Updates records automatically</strong>{" "}
        <span className="text-foreground/70">— after every site visit, call or vendor email, the CRM stays current without manual entry.</span>
      </p>
    </Card>
  );
}

export default function AiAssistantSection() {
  return (
    <SkyBackdrop variant="soft" className="py-24">
      <div className="container mx-auto section-padding max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            An AI assistant that <span className="text-gradient">does the work for you</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-foreground/70">
            Chirpeel AI learns your studio's workflow and handles the busywork — drafting quotations,
            chasing vendors, and keeping every project record current.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <ActionsCard />
          <SearchCard />
          <AutoUpdateCard />
        </div>
      </div>
    </SkyBackdrop>
  );
}
