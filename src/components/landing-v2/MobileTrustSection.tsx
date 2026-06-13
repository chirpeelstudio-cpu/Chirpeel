import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Star, ShieldCheck, Users, Sparkles, Mic, Plus,
  Home, BarChart3, FileText, Building2, Send, Signal, Wifi, BatteryFull,
  CheckCircle2, IndianRupee,
} from "lucide-react";
import SkyBackdrop from "./SkyBackdrop";
import logo from "@/assets/chirpeel-logo.png";

/* ---------------- Phone screens ---------------- */

function HomeScreen() {
  return (
    <div className="px-4 pt-3 space-y-3">
      <div>
        <div className="text-[15px] font-bold font-display leading-tight">Good morning, Priya</div>
        <div className="text-[10px] text-muted-foreground">Thursday · Bengaluru · 26°C</div>
      </div>
      <div className="rounded-2xl border border-border bg-background p-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <div className="flex-1 text-[11px] truncate">Send Karthik the revised quote</div>
          <Mic className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-background p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Today's leads</div>
          <div className="text-lg font-bold mt-0.5">7</div>
          <div className="text-[9px] text-primary font-semibold">+3 vs yesterday</div>
        </div>
        <div className="rounded-xl border border-border bg-background p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Quotes pending</div>
          <div className="text-lg font-bold mt-0.5">4</div>
          <div className="text-[9px] text-amber-600 font-semibold">2 awaiting reply</div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-background p-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-[10px] font-bold flex items-center justify-center">KR</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold truncate">Karthik R · 2m</div>
            <div className="text-[10px] text-muted-foreground truncate">Pollachi villa — needs revised quote</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineScreen() {
  const cols = [
    { stage: "New", leads: [{ n: "Anand V.", b: "₹15L" }] },
    { stage: "Quote", leads: [{ n: "Jai K.", b: "₹9L" }] },
    { stage: "Negotiation", leads: [{ n: "Karthik R", b: "₹18L" }] },
  ];
  return (
    <div className="px-4 pt-3 space-y-3">
      <div>
        <div className="text-[15px] font-bold font-display leading-tight">Pipeline</div>
        <div className="text-[10px] text-muted-foreground">12 active leads · ₹1.6Cr potential</div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {cols.map((c) => (
          <div key={c.stage} className="rounded-xl border border-border bg-background p-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">{c.stage}</span>
              <span className="text-[8px] bg-muted rounded-full px-1 text-muted-foreground">{c.leads.length}</span>
            </div>
            {c.leads.map((l) => (
              <div key={l.n} className="rounded-md bg-muted/40 p-1.5 text-[9px]">
                <div className="font-semibold truncate">{l.n}</div>
                <div className="text-muted-foreground">{l.b}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-background p-2.5">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Conversion · 30 days</div>
        <div className="flex items-end gap-1 h-10">
          {[40, 60, 35, 75, 55, 85, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuoteScreen() {
  return (
    <div className="px-4 pt-3 space-y-3">
      <div className="rounded-xl border border-border bg-background p-2.5">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="w-6 h-6 rounded object-contain" />
          <div className="flex-1">
            <div className="text-[11px] font-bold">Quotation HC-2026-0042</div>
            <div className="text-[9px] text-muted-foreground">Karthik R · Pollachi villa</div>
          </div>
          <span className="text-[8px] font-bold text-amber-700 bg-amber-500/20 px-1.5 py-0.5 rounded">Draft</span>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {[
          { room: "Modular kitchen", brand: "Hettich", amt: "3,40,000" },
          { room: "Master bedroom", brand: "Hafele", amt: "2,80,000" },
          { room: "Living TV unit", brand: "Greenply", amt: "1,90,000" },
        ].map((r, i) => (
          <div key={i} className="flex items-center justify-between px-2.5 py-1.5 border-b border-border last:border-0 text-[10px]">
            <div>
              <div className="font-semibold">{r.room}</div>
              <div className="text-muted-foreground text-[9px]">{r.brand}</div>
            </div>
            <div className="font-semibold flex items-center"><IndianRupee className="w-2.5 h-2.5" />{r.amt}</div>
          </div>
        ))}
        <div className="flex items-center justify-between px-2.5 py-2 bg-muted/40 text-[11px] font-bold">
          <span>Total · incl. GST</span>
          <span className="flex items-center"><IndianRupee className="w-3 h-3" />8,10,000</span>
        </div>
      </div>
      <button className="w-full rounded-xl bg-primary text-primary-foreground text-[11px] font-semibold py-2 flex items-center justify-center gap-1.5 shadow-sm">
        <Send className="w-3 h-3" /> Send to client + payment link
      </button>
    </div>
  );
}

const SCREENS = [
  { key: "home", label: "Home", node: <HomeScreen /> },
  { key: "pipeline", label: "Pipeline", node: <PipelineScreen /> },
  { key: "quote", label: "Quote", node: <QuoteScreen /> },
];

/* ---------------- Phone frame ---------------- */

function PhoneFrame() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SCREENS.length), 3500);
    return () => clearInterval(t);
  }, []);
  const active = SCREENS[idx];

  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="relative mx-auto"
      style={{ width: 300 }}
    >
      {/* Phone outer */}
      <div className="relative rounded-[42px] bg-foreground p-[10px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.35)] ring-1 ring-foreground/20">
        {/* Screen */}
        <div className="relative rounded-[34px] bg-background overflow-hidden" style={{ height: 600 }}>
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-2.5 text-[10px] font-semibold text-foreground/90">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <BatteryFull className="w-4 h-3.5" />
            </div>
          </div>
          {/* Dynamic island */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-foreground" />

          {/* Rotating screen content */}
          <div className="mt-3 h-[470px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {active.node}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom nav */}
          <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-3 pt-2 pb-5 flex items-end justify-around">
            {[
              { icon: Home, label: "Home", active: active.key === "home" },
              { icon: BarChart3, label: "Pipeline", active: active.key === "pipeline" },
              null,
              { icon: FileText, label: "Quotes", active: active.key === "quote" },
              { icon: Building2, label: "Projects", active: false },
            ].map((it, i) => {
              if (!it) {
                return (
                  <div key="add" className="-mt-5 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-4 ring-background">
                    <Plus className="w-5 h-5" />
                  </div>
                );
              }
              const Icon = it.icon;
              return (
                <div key={i} className={`flex flex-col items-center gap-0.5 ${it.active ? "text-primary" : "text-muted-foreground"}`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-[8px] font-semibold">{it.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating notification badge */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="absolute -right-4 top-24 hidden sm:flex items-center gap-2 bg-background border border-border rounded-2xl shadow-xl px-3 py-2"
      >
        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="text-[10px] leading-tight">
          <div className="font-bold">New lead won</div>
          <div className="text-muted-foreground">Karthik R · ₹18L</div>
        </div>
      </motion.div>

      {/* Floating screen indicator dots */}
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {SCREENS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Show ${s.label} screen`}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-6 bg-primary" : "w-1.5 bg-foreground/20"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ---------------- Section ---------------- */

export default function MobileTrustSection() {
  return (
    <SkyBackdrop variant="soft" className="py-24">
      <div className="container mx-auto section-padding max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — text + CTAs */}
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              Mobile-first
            </span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              Your studio, in your <span className="text-gradient">back pocket</span>
            </h2>
            <p className="mt-5 text-base sm:text-lg text-foreground/70 max-w-xl">
              Send a quote, log a site visit, or chase a vendor — all from your phone.
              Built mobile-first for designers who live on-site, not behind a desk.
            </p>

            {/* Trust strip */}
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 bg-background/80 backdrop-blur border border-foreground/10 rounded-full px-3 py-1.5 text-[12px] font-semibold">
                <Users className="w-3.5 h-3.5 text-primary" /> 500+ studios
              </div>
              <div className="inline-flex items-center gap-1.5 bg-background/80 backdrop-blur border border-foreground/10 rounded-full px-3 py-1.5 text-[12px] font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> 4.9/5 rating
              </div>
              <div className="inline-flex items-center gap-1.5 bg-background/80 backdrop-blur border border-foreground/10 rounded-full px-3 py-1.5 text-[12px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Bank-grade security
              </div>
            </div>

            {/* Mini testimonial */}
            <div className="mt-6 rounded-2xl border border-foreground/10 bg-background/80 backdrop-blur p-4 max-w-md">
              <div className="flex items-center gap-2 mb-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                ))}
              </div>
              <p className="text-[13px] text-foreground/80 leading-relaxed">
                "I sent 3 quotes from a site visit before I even drove back. My team replaced 4 apps with Chirpeel."
              </p>
              <div className="mt-2 text-[11px] text-muted-foreground font-semibold">
                Meera S. · Founder, Studio Liv · Bengaluru
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-7 flex items-center gap-3 flex-wrap">
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 bg-foreground text-background px-6 py-3 rounded-full text-sm font-semibold hover:scale-105 transition-transform shadow-lg"
              >
                Sign up free <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-1.5 bg-background/90 backdrop-blur border border-foreground/15 text-foreground px-6 py-3 rounded-full text-sm font-semibold hover:bg-background hover:scale-105 transition-all"
              >
                Watch 60s demo
              </a>
            </div>
            <p className="mt-3 text-[12px] text-muted-foreground">
              No credit card · 14-day free trial · Setup in 5 minutes
            </p>
          </div>

          {/* Right — phone */}
          <div className="flex justify-center lg:justify-end">
            <PhoneFrame />
          </div>
        </div>
      </div>
    </SkyBackdrop>
  );
}
