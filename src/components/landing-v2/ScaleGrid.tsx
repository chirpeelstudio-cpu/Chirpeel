import { motion } from "framer-motion";
import { Users, Palette, Zap, ShieldCheck, Smartphone, Sliders } from "lucide-react";
import { SCALE_CARDS } from "./data";

const ICONS = [Users, Palette, Zap, ShieldCheck, Smartphone, Sliders];

function Card({ c, i }: { c: typeof SCALE_CARDS[number]; i: number }) {
  const Icon = ICONS[i % ICONS.length];
  return (
    <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all">
      <Icon className="w-7 h-7 text-primary mb-4" />
      <h3 className="font-display font-bold text-xl mb-1.5">{c.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
    </div>
  );
}

function MobileVerticalMarquee() {
  // Duplicate so the loop is seamless
  const loop = [...SCALE_CARDS, ...SCALE_CARDS];
  return (
    <div className="sm:hidden relative h-[440px] overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-muted/30 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-muted/30 to-transparent z-10" />
      <motion.div
        className="flex flex-col gap-4"
        animate={{ y: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {loop.map((c, i) => (
          <div key={`${c.title}-${i}`} className="px-1">
            <Card c={c} i={i % SCALE_CARDS.length} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function ScaleGrid() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto section-padding max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            Built to <span className="text-gradient">scale with you</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Studio-grade infrastructure with the simplicity of a tool built for small teams.
          </p>
        </div>

        {/* Mobile: vertical auto-scroll marquee */}
        <MobileVerticalMarquee />

        {/* Tablet & desktop: original grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCALE_CARDS.map((c, i) => (
            <Card key={c.title} c={c} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
