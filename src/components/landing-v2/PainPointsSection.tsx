import {
  PhoneMissed,
  FolderX,
  AlarmClockOff,
  ReceiptText,
  Users,
  TrendingDown,
} from "lucide-react";
import { motion } from "framer-motion";
import SpotlightCard from "./SpotlightCard";
import AutoMarquee from "./AutoMarquee";

const PAINS = [
  { icon: PhoneMissed, title: "Missed follow-ups", desc: "Hot leads go cold while you're on a site visit. No reminders, no nudges.", tag: "Lost revenue" },
  { icon: FolderX, title: "Scattered client info", desc: "Briefs in WhatsApp, BOQs in Excel, photos in Drive, payments in memory.", tag: "Daily chaos" },
  { icon: AlarmClockOff, title: "Delayed projects", desc: "No single source of truth for milestones, vendors or payments — handovers slip.", tag: "Late delivery" },
  { icon: ReceiptText, title: "Quotation chaos", desc: "v3, v3-final, v3-final-FINAL.xlsx — and the client still has the old price.", tag: "Version hell" },
  { icon: Users, title: "Team out of sync", desc: "Designers, supervisors and vendors all working off different versions.", tag: "Misalignment" },
  { icon: TrendingDown, title: "Profit leaks", desc: "BOQ overruns, vendor advances, missed payments — margins quietly disappear.", tag: "Margin drop" },
] as const;

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function PainCard({ p }: { p: typeof PAINS[number] }) {
  const Icon = p.icon;
  return (
    <SpotlightCard tone="destructive" className="h-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]">
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-destructive/80 bg-destructive/5 px-2 py-1 rounded-full whitespace-nowrap">
          {p.tag}
        </span>
      </div>
      <h3 className="font-display font-bold text-lg sm:text-xl mb-1.5 leading-tight">{p.title}</h3>
      <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
    </SpotlightCard>
  );
}

export default function PainPointsSection() {
  return (
    <section
      className="relative py-16 sm:py-24 lg:py-28 bg-background overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(hsl(var(--border) / 0.55) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.55) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 500px at 50% 0%, hsl(var(--destructive) / 0.07), transparent 70%)",
        }}
      />

      <div className="relative container mx-auto section-padding max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ staggerChildren: 0.08, duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-10 sm:mb-14"
        >
          <motion.div
            variants={item}
            className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-destructive bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-full mb-4 sm:mb-5"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
            </span>
            The studio reality
          </motion.div>
          <motion.h2
            variants={item}
            className="font-display text-[28px] leading-[1.1] sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Still managing projects on{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-destructive">Excel &amp; WhatsApp?</span>
              <span aria-hidden className="absolute inset-x-0 bottom-1 h-2.5 sm:h-3 -z-0 bg-destructive/15 -skew-x-6" />
            </span>
          </motion.h2>
          <motion.p variants={item} className="mt-4 sm:mt-5 text-[15px] sm:text-lg text-muted-foreground px-2">
            You're not alone. Most studios across India lose hours every week to this stack — and clients feel it.
          </motion.p>
        </motion.div>

        {/* Mobile: auto-scrolling marquee (touch to pause) */}
        <div className="sm:hidden -mx-4 px-4">
          <AutoMarquee duration={40}>
            {PAINS.map((p) => (
              <PainCard key={p.title} p={p} />
            ))}
          </AutoMarquee>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">Tap to pause / resume</p>
        </div>

        {/* Tablet & desktop: grid */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          transition={{ staggerChildren: 0.06 }}
          className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {PAINS.map((p) => (
            <motion.div key={p.title} variants={item} transition={{ duration: 0.4 }}>
              <PainCard p={p} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
