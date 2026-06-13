import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SkyBackdrop from "./SkyBackdrop";

export default function FinalCtaHero() {
  return (
    <SkyBackdrop className="py-32">
      <div className="container mx-auto section-padding text-center">
        <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] text-foreground/95">
          Organised.
        </h2>
        <p className="font-display text-3xl sm:text-4xl lg:text-5xl mt-2 text-foreground/75 italic">
          So you don't have to be.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 bg-foreground text-background px-7 py-3 rounded-full text-sm font-semibold hover:scale-105 transition-transform"
          >
            Sign up free <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="tel:+919876543210"
            className="inline-flex items-center gap-1.5 bg-background/90 backdrop-blur border border-foreground/15 text-foreground px-7 py-3 rounded-full text-sm font-semibold hover:bg-background"
          >
            Talk to sales
          </a>
        </div>
      </div>
    </SkyBackdrop>
  );
}