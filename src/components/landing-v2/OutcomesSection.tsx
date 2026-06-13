import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { TrendingUp, BellOff, Layers, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import SpotlightCard from "./SpotlightCard";

type Outcome = {
  icon: typeof TrendingUp;
  prefix?: string;
  value: number;
  suffix?: string;
  unit?: string;
  label: string;
  desc: string;
  proof: string;
};

const OUTCOMES: Outcome[] = [
  {
    icon: TrendingUp,
    prefix: "+",
    value: 28,
    suffix: "%",
    label: "Close more clients",
    desc: "Hot leads bubble up. Branded quotations go out the same day — not next week.",
    proof: "Faster quotation",
  },
  {
    icon: BellOff,
    prefix: "−",
    value: 6,
    unit: " hrs / week",
    label: "Less follow-up chaos",
    desc: "Auto WhatsApp nudges and reminders run for you. Nothing falls through the cracks.",
    proof: "Smart follow-ups",
  },
  {
    icon: Layers,
    value: 3,
    suffix: "×",
    label: "Manage multiple projects easily",
    desc: "One dashboard for every site, every stage, every payment — across your studio.",
    proof: "Projects on rails",
  },
];

function CountUp({ to, duration = 900 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return <span ref={ref}>{n}</span>;
}

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

function OutcomeCard({ o, i }: { o: Outcome; i: number }) {
  const Icon = o.icon;
  return (
    <SpotlightCard tone="primary" className="h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="relative w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-0.5">
          <Icon className="w-5 h-5" strokeWidth={2} />
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
            {i + 1}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">
          Typical results
        </span>
      </div>

      <div className="font-display font-bold leading-none tracking-tight text-5xl sm:text-6xl">
        {o.prefix && <span className="text-gradient">{o.prefix}</span>}
        <span className="text-gradient">
          <CountUp to={o.value} />
        </span>
        {o.suffix && <span className="text-gradient">{o.suffix}</span>}
        {o.unit && (
          <span className="ml-2 text-base sm:text-lg font-semibold text-foreground/70 align-middle">
            {o.unit}
          </span>
        )}
      </div>

      <h3 className="mt-5 font-display font-bold text-lg sm:text-xl leading-tight">
        {o.label}
      </h3>
      <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground leading-relaxed">
        {o.desc}
      </p>

      <a
        href="#features"
        className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:gap-2 transition-all"
      >
        {o.proof}
        <ArrowRight className="w-3.5 h-3.5" />
      </a>
    </SpotlightCard>
  );
}

export default function OutcomesSection() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const scrollToIdx = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.children[i] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const cCenter = c.offsetLeft + c.clientWidth / 2;
      const d = Math.abs(cCenter - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    if (best !== activeIdx) setActiveIdx(best);
  };

  return (
    <section
      className="relative py-16 sm:py-24 lg:py-28 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--accent) / 0.25) 0%, hsl(var(--background)) 70%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--primary) / 0.14) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(900px 520px at 50% 25%, black, transparent 75%)",
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
            Real outcomes
          </motion.div>

          <motion.h2
            variants={item}
            className="font-display text-[28px] leading-[1.1] sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            <span className="text-gradient">Close more.</span>{" "}
            <span className="text-gradient">Chase less.</span>{" "}
            <span className="block sm:inline">Ship calmly.</span>
          </motion.h2>

          <motion.p
            variants={item}
            className="mt-4 sm:mt-5 text-[15px] sm:text-lg text-muted-foreground px-2"
          >
            Three numbers our studios actually feel within the first 30 days — fewer
            missed leads, far less chasing, and projects that ship without the chaos.
          </motion.p>
        </motion.div>

        {/* Mobile: Instagram-style horizontal snap carousel */}
        <div className="sm:hidden -mx-4">
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none px-4 pb-2"
            style={{ scrollPaddingLeft: 16, scrollPaddingRight: 16 }}
          >
            {OUTCOMES.map((o, i) => (
              <motion.div
                key={o.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="snap-center shrink-0 w-[82vw] max-w-[340px]"
              >
                <OutcomeCard o={o} i={i} />
              </motion.div>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {OUTCOMES.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to outcome ${i + 1}`}
                onClick={() => scrollToIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIdx
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-foreground/20"
                }`}
              />
            ))}
          </div>

          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Swipe to see all {OUTCOMES.length} →
          </p>
        </div>

        {/* Tablet & desktop: grid */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          transition={{ staggerChildren: 0.1 }}
          className="hidden sm:grid sm:grid-cols-3 gap-4"
        >
          {OUTCOMES.map((o, i) => (
            <motion.div key={o.label} variants={item} transition={{ duration: 0.45 }}>
              <OutcomeCard o={o} i={i} />
            </motion.div>
          ))}
        </motion.div>

        <p className="mt-8 text-center text-[12px] sm:text-[13px] text-muted-foreground italic">
          — Typical results from studios across Tirupur, Coimbatore & Erode.
        </p>

        <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
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
  );
}