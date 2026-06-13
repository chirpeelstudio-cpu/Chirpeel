import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import SkyBackdrop from "./SkyBackdrop";
import { INTEGRATIONS } from "./data";
import { Boxes, Database, Network, Plug } from "lucide-react";

const TILES = [
  { icon: Plug, title: "50+ Integrations", desc: "WhatsApp, Razorpay, Tally, Drive, Calendar — your tools, connected." },
  { icon: Database, title: "Structured Data", desc: "Every lead, quotation and PO automatically organised with properties and tags." },
  { icon: Boxes, title: "Custom Objects", desc: "Rooms, BOQ items, vendors, milestones — model anything specific to your studio." },
  { icon: Network, title: "Interconnected", desc: "Lead → quotation → project → vendor PO → invoice. Search once, find everything." },
];

/** Mobile: horizontal snap carousel with 3D flip-in + auto-advance + dots */
function MobileFlipCarousel() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<number | null>(null);

  // Auto-advance every 3.5s — pauses on user interaction
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const next = (active + 1) % TILES.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 3500);
    return () => clearInterval(id);
  }, [active, paused]);

  // Track which card is centered
  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== active) setActive(idx);
  }

  // Pause on touch/drag, resume 4s after the user stops interacting
  function pauseAutoplay() {
    setPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
  }
  function scheduleResume() {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 4000);
  }
  useEffect(() => () => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
  }, []);

  return (
    <div className="sm:hidden">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={pauseAutoplay}
        onPointerUp={scheduleResume}
        onPointerCancel={scheduleResume}
        onTouchStart={pauseAutoplay}
        onTouchEnd={scheduleResume}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
        style={{ scrollbarWidth: "none" }}
      >
        {TILES.map((t, i) => (
          <FlipCard key={t.title} tile={t} index={i} active={i === active} />
        ))}
      </div>

      {/* Dots */}
      <div className="mt-5 flex items-center justify-center gap-2">
        {TILES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              const el = scrollerRef.current;
              if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-6 bg-primary" : "w-1.5 bg-foreground/25"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function FlipCard({
  tile,
  index,
  active,
}: {
  tile: (typeof TILES)[number];
  index: number;
  active: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { amount: 0.6 });

  return (
    <div
      ref={ref}
      className="snap-center shrink-0 w-full px-1"
      style={{ perspective: 1000 }}
    >
      <motion.div
        initial={{ rotateY: -90, opacity: 0 }}
        animate={
          inView
            ? { rotateY: 0, opacity: 1, scale: active ? 1 : 0.96 }
            : { rotateY: -90, opacity: 0 }
        }
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
        style={{ transformStyle: "preserve-3d" }}
        className="rounded-3xl bg-background/95 backdrop-blur border border-foreground/10 p-7 shadow-xl min-h-[210px] flex flex-col"
      >
        {/* Animated icon halo */}
        <div className="relative w-12 h-12 mb-4">
          <motion.div
            className="absolute inset-0 rounded-2xl bg-primary/15"
            animate={
              active
                ? { scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }
                : { scale: 1, opacity: 0.4 }
            }
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <tile.icon className="w-6 h-6 text-primary" />
          </div>
        </div>

        <h3 className="font-display font-bold text-lg mb-2">{tile.title}</h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{tile.desc}</p>

        {/* Progress underline that fills while card is active */}
        <div className="mt-auto pt-5">
          <div className="h-[3px] w-full rounded-full bg-foreground/10 overflow-hidden">
            <motion.div
              key={active ? `a-${index}` : `i-${index}`}
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: active ? "100%" : "0%" }}
              transition={{ duration: active ? 3.4 : 0.2, ease: "linear" }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ContextGraphSection() {
  return (
    <SkyBackdrop className="py-24">
      <div className="container mx-auto section-padding max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-foreground/95">
            Powered by your studio's <span className="text-gradient">context graph</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-foreground/75">
            50+ integrations bring your data together into one connected workspace.
          </p>
        </div>

        {/* Floating logo cloud */}
        <div className="relative h-44 sm:h-52 mb-12 rounded-3xl bg-background/40 backdrop-blur border border-foreground/10 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center flex-wrap gap-3 p-6">
            {INTEGRATIONS.map((name, i) => (
              <div
                key={name}
                className="px-3 py-1.5 rounded-full bg-background shadow-md border border-border text-xs font-semibold animate-float"
                style={{ animationDelay: `${(i % 6) * -0.6}s` }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: 3D flip carousel */}
        <MobileFlipCarousel />

        {/* Tablet & desktop: original grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TILES.map((t) => (
            <div key={t.title} className="rounded-2xl bg-background/95 backdrop-blur border border-foreground/10 p-5 shadow-lg">
              <t.icon className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-display font-bold text-base mb-1.5">{t.title}</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </SkyBackdrop>
  );
}
