import { motion } from "framer-motion";
import { Star } from "lucide-react";
import SkyBackdrop from "./SkyBackdrop";

type Testimonial = {
  initials: string;
  name: string;
  role: string;
  city: string;
  quote: string;
};

const ROW_1: Testimonial[] = [
  {
    initials: "PR",
    name: "Priya Raghavan",
    role: "Founder, Form & Function",
    city: "Bengaluru",
    quote:
      "I used to juggle Excel for quotations, WhatsApp for clients and Tally for vendors. Now everything lives in Chirpeel and the AI keeps it organised — I actually get to design.",
  },
  {
    initials: "AS",
    name: "Arjun Sharma",
    role: "Principal Designer, Studio Maaya",
    city: "Mumbai",
    quote:
      "Sending a branded quotation used to take half a day. With Chirpeel it's 20 minutes — and clients pay faster because the payment link is right there.",
  },
  {
    initials: "RK",
    name: "Reema Khanna",
    role: "Co-founder, Habitat Lab",
    city: "Delhi NCR",
    quote:
      "We onboarded our 6-person team in a weekend. The pipeline is finally one source of truth instead of 11 WhatsApp groups.",
  },
  {
    initials: "MV",
    name: "Mohan Verghese",
    role: "Founder, Cube Atelier",
    city: "Hyderabad",
    quote:
      "Vendor POs auto-fill from approved BOQs. Our procurement team is no longer the bottleneck on every project.",
  },
];

const ROW_2: Testimonial[] = [
  {
    initials: "SI",
    name: "Sneha Iyer",
    role: "Creative Director, The Drawing Room",
    city: "Chennai",
    quote:
      "The client portal alone won us two referrals this quarter. Clients love seeing real-time progress photos from site.",
  },
  {
    initials: "KM",
    name: "Karthik Menon",
    role: "Founder, Anjali Designs",
    city: "Pune",
    quote:
      "Follow-ups don't slip anymore. The AI nudges me on cold leads every morning — I closed 3 deals last month from leads I'd marked lost.",
  },
  {
    initials: "DP",
    name: "Divya Patel",
    role: "Studio Lead, Vrindavan Interiors",
    city: "Ahmedabad",
    quote:
      "Quotations, projects and finance in one place. Our CA finally stopped chasing me for invoices at month-end.",
  },
  {
    initials: "AR",
    name: "Aditya Rao",
    role: "Founder, North Star Studio",
    city: "Kolkata",
    quote:
      "Site supervisors update from mobile and I see it on the dashboard instantly. Game changer for managing 5 sites at once.",
  },
];

function Card({ t }: { t: Testimonial }) {
  return (
    <div className="shrink-0 w-[320px] sm:w-[360px] rounded-3xl bg-background/95 backdrop-blur border border-foreground/10 shadow-lg p-6 flex flex-col">
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
        ))}
      </div>
      <p className="text-[14px] sm:text-[15px] leading-relaxed text-foreground/85 flex-1">
        &ldquo;{t.quote}&rdquo;
      </p>
      <div className="mt-5 pt-5 border-t border-foreground/10 flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold flex items-center justify-center text-sm">
          {t.initials}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm truncate">{t.name}</div>
          <div className="text-[11px] text-foreground/70 truncate">
            {t.role} · {t.city}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  items,
  duration,
  reverse = false,
}: {
  items: Testimonial[];
  duration: number;
  reverse?: boolean;
}) {
  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10" />
      <motion.div
        className="flex gap-5 w-max"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      >
        {loop.map((t, i) => (
          <Card key={`${t.initials}-${i}`} t={t} />
        ))}
      </motion.div>
    </div>
  );
}

export default function TestimonialBand() {
  return (
    <SkyBackdrop className="py-24">
      <div className="container mx-auto section-padding text-center max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.2em] font-semibold text-primary mb-3">
          Loved by studios
        </div>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-foreground">
          Trusted by India's busiest studios
        </h2>
        <p className="mt-4 text-sm sm:text-base text-foreground/75">
          From boutique 2-person studios to 30-designer firms — here's what founders say
          after switching to Chirpeel.
        </p>
      </div>

      <div className="mt-12 space-y-5">
        <Row items={ROW_1} duration={50} />
        <Row items={ROW_2} duration={60} reverse />
      </div>
    </SkyBackdrop>
  );
}