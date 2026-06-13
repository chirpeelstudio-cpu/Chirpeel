import { useState } from "react";
import { HelpCircle, X, MessageCircle, BookOpen, Sparkles, Mail, Phone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { replayWelcomeTour } from "./onboarding/tourState";

const FAQS: { q: string; a: string }[] = [
  { q: "How do I add a new lead?", a: "Click the green 'Add Lead' button in the top-right of any CRM screen, fill in name + phone, then save." },
  { q: "How do I move a lead through the pipeline?", a: "Open the Pipeline tab. On desktop, drag the card to a new column. On mobile, tap the card and change the Stage from the detail panel." },
  { q: "How do I send a quotation to a client?", a: "Open Quotations → New Quotation, pick the lead, build the BOQ from your pricing catalog, then click 'Send PDF' or 'Share link'." },
  { q: "How do I add another team member?", a: "Settings → Team → Add Team Member. Choose a role (Sales / Designer / Accounts / Admin) — permissions are pre-set for each role." },
  { q: "Where do I clear the demo data?", a: "Settings → About → 'Clear demo data'. It removes only rows tagged DEMO; your real leads/projects stay." },
  { q: "Can I export everything?", a: "Yes — Settings → Data Export → 'Export ZIP' downloads every CSV in one zip file." },
  { q: "Why is my follow-up showing red / OVERDUE?", a: "A lead with a follow-up date older than the threshold (Settings → Workflow) gets highlighted so it doesn't slip through." },
  { q: "How do I change my company logo / brand colors?", a: "Branding tab in the sidebar — upload your logo, set the primary color, choose a PDF theme." },
];

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = q
    ? FAQS.filter(f => (f.q + " " + f.a).toLowerCase().includes(q.toLowerCase()))
    : FAQS;

  return (
    <>
      {/* Floating launcher button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "Close help" : "Open help"}
        data-tour="help-widget"
        className="fixed z-40 right-4 bottom-4 md:right-6 md:bottom-6 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        {open ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed z-40 right-3 bottom-20 md:right-6 md:bottom-24 w-[calc(100vw-1.5rem)] sm:w-96 max-h-[70vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-label="Help"
        >
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="font-display font-semibold leading-tight">Need a hand?</div>
                <div className="text-xs text-muted-foreground">Search common questions or contact us.</div>
              </div>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search help…"
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-2">
            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                Nothing matches "{q}". Try contacting us below.
              </div>
            ) : filtered.map((f, i) => (
              <details
                key={i}
                className="group rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <summary className="cursor-pointer text-sm font-medium list-none flex items-start gap-2">
                  <BookOpen className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                  <span className="flex-1">{f.q}</span>
                </summary>
                <p className="text-xs text-muted-foreground mt-2 pl-5.5 ml-1.5 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="border-t border-border p-3 space-y-2 bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => { setOpen(false); replayWelcomeTour(); }}
            >
              <Sparkles className="w-4 h-4 mr-2 text-primary" />
              Replay welcome tour
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm" className="justify-start">
                <a href="mailto:hello@chirpeel.com">
                  <Mail className="w-4 h-4 mr-1.5" /> Email us
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start">
                <a href="tel:+919585896733">
                  <Phone className="w-4 h-4 mr-1.5" /> Call us
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
