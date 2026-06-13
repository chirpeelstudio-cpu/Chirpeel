import { Link } from "react-router-dom";
import { Play, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import SkyBackdrop from "./SkyBackdrop";
import AppMockup from "./AppMockup";
import logo from "@/assets/chirpeel-logo.png";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function SkyHero() {
  return (
    <SkyBackdrop className="pt-0 pb-0">
      {/* Top nav */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-20 pt-4 pb-2 my-[15px]"
      >
        <div className="container mx-auto section-padding flex items-center justify-between">
          <Link to="/" aria-label="Chirpeel home" className="flex items-center">
            <img src={logo} alt="Chirpeel" className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-foreground/80">
            <a href="#features" className="hover:text-foreground transition-colors">Product</a>
            <a href="#skills" className="hover:text-foreground transition-colors">Skills</a>
            <a href="#playbooks" className="hover:text-foreground transition-colors">Resources</a>
            <Link to="/" className="hover:text-foreground transition-colors">Original site</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-semibold text-foreground/85 px-3 py-2">Log in</Link>
            <Link
              to="/signup"
              className="bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-full hover:scale-105 transition-transform"
            >
              Sign up
            </Link>
          </div>
        </div>
      </motion.header>

      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.12, delayChildren: 0.1 }}
        className="container mx-auto section-padding text-center relative z-10"
      >
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center gap-2 bg-background/70 backdrop-blur border border-foreground/10 text-[11px] uppercase tracking-[0.2em] font-semibold text-primary px-3 py-1.5 rounded-full mb-4"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          For interior design studios in India
        </motion.div>

        <motion.h1
          variants={fadeUp}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="font-display font-bold tracking-tight text-foreground/95 leading-[0.95] text-[clamp(2.75rem,7vw,7rem)] max-w-5xl mx-auto my-0 py-[30px]"
        >
          Run your interior projects
          <br />
          <em className="italic font-normal">without the chaos</em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-foreground/80"
        >
          From lead to handover in one place — site visits, BOQ quotations, vendor POs,
          payments and the client portal. With AI that handles follow-ups, drafts quotes
          and keeps every project on track, so you can get back to designing.
        </motion.p>

        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mt-9 flex items-center justify-center gap-3 flex-wrap"
        >
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 bg-foreground text-background px-6 py-3 rounded-full text-sm font-semibold hover:scale-105 transition-transform"
          >
            Start free — no card needed <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="tel:+919876543210"
            className="inline-flex items-center gap-1.5 bg-background/90 backdrop-blur border border-foreground/15 text-foreground px-6 py-3 rounded-full text-sm font-semibold hover:bg-background hover:scale-105 transition-all"
          >
            Talk to sales
          </a>
        </motion.div>

        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mt-5 flex items-center justify-center gap-x-2 gap-y-1 flex-wrap text-xs text-foreground/65"
        >
          <span className="font-semibold text-foreground/80">Trusted by 500+ studios</span>
          <span className="text-foreground/30">·</span>
          <span>Mumbai</span>
          <span className="text-foreground/30">·</span>
          <span>Bengaluru</span>
          <span className="text-foreground/30">·</span>
          <span>Delhi NCR</span>
          <span className="text-foreground/30">·</span>
          <span>Chennai</span>
          <span className="text-foreground/30">·</span>
          <span>Pune</span>
        </motion.div>

        <motion.button
          variants={fadeUp}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mt-6 inline-flex items-center gap-2 bg-foreground/85 backdrop-blur text-background text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-foreground transition-colors"
        >
          <span className="w-5 h-5 rounded-full bg-primary inline-flex items-center justify-center">
            <Play className="w-2.5 h-2.5 fill-current" />
          </span>
          Watch the launch video
        </motion.button>

        {/* App mock */}
        <div className="mt-16 max-w-5xl mx-auto px-2 sm:px-0 pb-16 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            className="origin-top sm:scale-[1.15] sm:mb-[8%]"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <AppMockup />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </SkyBackdrop>
  );
}
