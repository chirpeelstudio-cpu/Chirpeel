import { Helmet } from "react-helmet-async";
import SkyHero from "@/components/landing-v2/SkyHero";
import LogoStrip from "@/components/landing-v2/LogoStrip";
import PainPointsSection from "@/components/landing-v2/PainPointsSection";
import SolutionsSection from "@/components/landing-v2/SolutionsSection";
import OutcomesSection from "@/components/landing-v2/OutcomesSection";
import FeatureBlockSky from "@/components/landing-v2/FeatureBlockSky";
import { LeadsMockup, QuoteMockup, ProjectsMockup } from "@/components/landing-v2/FeatureMockups";
import { REPLACES_LEADS, REPLACES_QUOTES, REPLACES_PROJECTS } from "@/components/landing-v2/data";
import AiAssistantSection from "@/components/landing-v2/AiAssistantSection";
import SkillsGrid from "@/components/landing-v2/SkillsGrid";
import TestimonialBand from "@/components/landing-v2/TestimonialBand";
import MobileTrustSection from "@/components/landing-v2/MobileTrustSection";
import ContextGraphSection from "@/components/landing-v2/ContextGraphSection";
import ScaleGrid from "@/components/landing-v2/ScaleGrid";
import PlaybooksSection from "@/components/landing-v2/PlaybooksSection";
import FounderNote from "@/components/landing-v2/FounderNote";
import FinalCtaHero from "@/components/landing-v2/FinalCtaHero";
import logo from "@/assets/chirpeel-logo.png";

export default function LandingV2() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Chirpeel — The studio OS for interior designers in India</title>
        <meta
          name="description"
          content="Run your interior design studio from one place — leads, site visits, BOQ quotations, vendor POs, payments and the client portal. AI handles the busywork so you can design."
        />
        <link rel="canonical" href="/" />
      </Helmet>

      {/* Hero with sky background + nav + app mockup */}
      <SkyHero />

      {/* Built by 500+ studios */}
      <LogoStrip />

      {/* Pain points — problem framing */}
      <PainPointsSection />

      {/* Solutions — how Chirpeel fixes each pain */}
      <SolutionsSection />

      {/* Outcomes — what changes for the user */}
      <OutcomesSection />

      {/* Section heading bridge */}
      <section className="bg-background pt-24 pb-4 text-center">
        <div className="container mx-auto section-padding max-w-3xl">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight" id="features">
            One place for <span className="text-gradient">everything</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Everything you need to win leads, quote fast, ship projects and delight clients.
          </p>
        </div>
      </section>

      <FeatureBlockSky
        eyebrow="Lead pipeline · CRM"
        title="Leads that organise themselves"
        desc="Auto-enriched leads, stage scoring, follow-up nudges and a Kanban that mirrors your studio's real sales process."
        detail="WhatsApp + IndiaMART + Justdial inboxes route into one pipeline. Hot leads bubble up, cold leads get a nudge."
        replaces={REPLACES_LEADS}
        mockup={<LeadsMockup />}
      />

      <FeatureBlockSky
        eyebrow="Quotations"
        title="Branded quotations in minutes"
        desc="Build room-by-room BOQs with brand catalogs, GST presets and version compare. Send a polished PDF + payment link in one click."
        detail="Pick the brands (Hettich, Hafele, Greenply, Merino), add rooms, and Chirpeel does the math — including GST and discounts."
        replaces={REPLACES_QUOTES}
        mockup={<QuoteMockup />}
        reverse
      />

      <FeatureBlockSky
        eyebrow="Projects · Vendors · Finance"
        title="From quotation to handover, on rails"
        desc="Tasks, milestones, BOQ-driven vendor POs, payments and invoices — all linked to the lead they came from."
        detail="Site supervisors update progress from mobile. Vendor POs auto-fill from approved BOQs. Finance stays clean."
        replaces={REPLACES_PROJECTS}
        mockup={<ProjectsMockup />}
      />

      {/* AI assistant */}
      <AiAssistantSection />

      {/* Skills grid */}
      <div id="skills"><SkillsGrid /></div>

      {/* Testimonial band */}
      <TestimonialBand />

      {/* Mobile-first trust + signup CTA */}
      <MobileTrustSection />

      {/* Context graph */}
      <ContextGraphSection />

      {/* Scale grid */}
      <ScaleGrid />

      {/* Playbooks */}
      <div id="playbooks"><PlaybooksSection /></div>

      {/* Founder note */}
      <FounderNote />

      {/* Final CTA */}
      <FinalCtaHero />

      {/* Footer */}
      <footer className="bg-foreground text-background py-10">
        <div className="container mx-auto section-padding flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <img src={logo} alt="Chirpeel" className="h-7 w-auto brightness-0 invert" />
          <div className="text-background/70">© {new Date().getFullYear()} Chirpeel · Made in India</div>
          <div className="flex items-center gap-4 text-background/70">
            <a href="/privacy-policy" className="hover:text-background">Privacy</a>
            <a href="/terms" className="hover:text-background">Terms</a>
            <a href="/refund-policy" className="hover:text-background">Refund</a>
          </div>
        </div>
      </footer>
    </div>
  );
}