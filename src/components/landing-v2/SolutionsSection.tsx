import {
  BellRing,
  Database,
  CalendarCheck,
  FileCheck2,
  UsersRound,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SpotlightCard from "./SpotlightCard";
import AutoMarquee from "./AutoMarquee";

const SOLUTIONS = [
  { icon: BellRing, title: "Auto follow-up nudges", desc: "Smart reminders ping you (and your team) the moment a lead goes quiet.", pairs: "Missed follow-ups" },
  { icon: Database, title: "One client record", desc: "Brief, BOQ, photos, payments and chat history — all on one screen.", pairs: "Scattered info" },
  { icon: CalendarCheck, title: "Milestones on rails", desc: "Stage-wise tracker with site updates, vendor POs and payments linked.", pairs: "Delayed projects" },
  { icon: FileCheck2, title: "Versioned quotations", desc: "Branded PDFs with a single live version. Compare revisions in one click.", pairs: "Quotation chaos" },
  { icon: UsersRound, title: "Shared team workspace", desc: "Designers, supervisors and vendors see the same truth in real time.", pairs: "Team out of sync" },
  { icon: TrendingUp, title: "Live margins & finance", desc: "BOQ vs actuals, vendor advances and receivables — margins stay healthy.", pairs: "Profit leaks" },
] as const;

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function SolutionCard({ s, i }: { s: typeof SOLUTIONS[number]; i: number }) {
  const Icon = s.icon;
  return (
    <SpotlightCard tone="primary" className="h-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[4deg]">
          <Icon className="w-5 h-5" strokeWidth={2} />
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
            {i + 1}
          </span>
        </div>
        <span className="inline-flex flex-col items-end text-right">
          <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70">Fixes</span>
          <span className="text-[11px] font-semibold text-primary leading-tight">{s.pairs}</span>
        </span>
      </div>
      <h3 className="font-display font-bold text-lg sm:text-xl mb-1.5 leading-tight">{s.title}</h3>
      <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
    </SpotlightCard>
  );
}

export default function SolutionsSection() {
  return (
    <>
      {/* Connector band */}
      <div className="relative bg-background overflow-hidden">
        <div className="container mx-auto section-padding max-w-6xl">
          <div className="relative flex items-center justify-center py-7 sm:py-10">
            <div
              aria-hidden
              className="absolute inset-x-0 top-1/2 h-px"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, transparent, hsl(var(--border)) 20%, hsl(var(--border)) 80%, transparent)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.4 }}
              className="relative inline-flex items-center gap-2 bg-background px-4 sm:px-5 py-2 rounded-full border border-border shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/70">
                Here's the fix
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      <section
        className="relative py-16 sm:py-24 lg:py-28 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--accent) / 0.35) 0%, hsl(var(--background)) 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--primary) / 0.18) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(800px 500px at 50% 30%, black, transparent 75%)",
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
              className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4 sm:mb-5"
            >
              <Sparkles className="w-3 h-3" />
              How Chirpeel fixes it
            </motion.div>
            <motion.h2
              variants={item}
              className="font-display text-[28px] leading-[1.1] sm:text-5xl lg:text-6xl font-bold tracking-tight"
            >
              One calm app —{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-gradient">six fewer headaches</span>
                <span aria-hidden className="absolute inset-x-0 bottom-1 h-2.5 sm:h-3 -z-0 bg-primary/15 -skew-x-6" />
              </span>
            </motion.h2>
            <motion.p variants={item} className="mt-4 sm:mt-5 text-[15px] sm:text-lg text-muted-foreground px-2">
              Each pain above has a built-in fix inside Chirpeel. No new logins, no extra tools — just one place that runs your studio end-to-end.
            </motion.p>
          </motion.div>

          {/* Mobile: auto-scrolling marquee (touch to pause) */}
          <div className="sm:hidden -mx-4 px-4">
            <AutoMarquee duration={40} direction="right">
              {SOLUTIONS.map((s, i) => (
                <SolutionCard key={s.title} s={s} i={i} />
              ))}
            </AutoMarquee>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Touch to pause</p>
          </div>

          {/* Tablet & desktop: grid */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            transition={{ staggerChildren: 0.06 }}
            className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {SOLUTIONS.map((s, i) => (
              <motion.div key={s.title} variants={item} transition={{ duration: 0.4 }}>
                <SolutionCard s={s} i={i} />
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-10 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-foreground text-background px-6 py-3.5 rounded-full text-sm font-semibold hover:opacity-90 transition-all hover:gap-3 active:scale-[0.98]"
            >
              Start your studio free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="story-link text-sm font-semibold text-foreground/70 hover:text-foreground px-4 py-3"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
