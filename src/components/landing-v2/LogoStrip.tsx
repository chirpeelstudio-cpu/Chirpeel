import { motion } from "framer-motion";

const STUDIOS = [
  "Form & Function", "Vrindavan Interiors", "Cube Atelier", "Anjali Designs",
  "Studio Maaya", "Habitat Lab", "The Drawing Room",
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function LogoStrip() {
  // Duplicate list for seamless marquee
  const marquee = [...STUDIOS, ...STUDIOS];

  return (
    <section className="py-14 bg-background border-b border-border overflow-hidden">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.12 }}
        className="container mx-auto section-padding text-center"
      >
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-[11px] uppercase tracking-[0.2em] font-semibold text-primary mb-3"
        >
          Trusted by studios
        </motion.div>
        <motion.h2
          variants={fadeUp}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3"
        >
          The studios shaping India's homes
        </motion.h2>
        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-xs sm:text-sm font-semibold text-muted-foreground tracking-wide max-w-2xl mx-auto"
        >
          Built and used by 500+ studios across Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai, Pune, Kolkata &amp; Ahmedabad
        </motion.p>
      </motion.div>

      {/* Marquee row */}
      <div className="mt-8 relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
        <motion.div
          className="flex gap-x-12 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {marquee.map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="font-display text-base sm:text-lg text-foreground/55 hover:text-foreground transition-colors shrink-0"
            >
              {s}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
