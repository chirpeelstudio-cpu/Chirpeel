import { useEffect, useState } from "react";
import { FileText, Sheet, BookOpen, MonitorSmartphone, Download, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { PLAYBOOKS } from "./data";
import PlaybookGateDialog, { getStoredVerification } from "./PlaybookGateDialog";

const ICONS = { FileText, Sheet, BookOpen, MonitorSmartphone } as const;

export default function PlaybooksSection() {
  const [verified, setVerified] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);

  useEffect(() => {
    setVerified(!!getStoredVerification());
  }, []);

  const handleCardClick = (e: React.MouseEvent, file: string, title: string) => {
    if (verified) return; // let the <a download> work natively
    e.preventDefault();
    setPendingFile(file);
    setPendingTitle(title);
    setGateOpen(true);
  };

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto section-padding max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            Try Chirpeel's <span className="text-gradient">playbooks</span> for free
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Steal our internal playbooks — sales scripts, quotation templates, BOQ catalog
            and a guided client portal tour. No fluff. No paywall.
          </p>
          {!verified && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
              <Lock className="w-3 h-3" /> Verify your email & mobile once to unlock all 4
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAYBOOKS.map((p) => {
            const Icon = ICONS[p.icon as keyof typeof ICONS] ?? Download;
            return (
              <a
                key={p.title}
                href={p.file}
                download={verified ? "" : undefined}
                onClick={(e) => handleCardClick(e, p.file, p.title)}
                className="group rounded-2xl border border-border bg-card p-5 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col"
              >
                <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-primary/15 via-accent to-primary/10 mb-4 flex items-center justify-center relative overflow-hidden">
                  <Icon className="w-12 h-12 text-primary/80 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  <div className="absolute top-2 right-2 rounded-full bg-background/90 backdrop-blur p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {verified ? (
                      <Download className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{p.tag}</div>
                <h3 className="font-display font-bold text-base mt-1">{p.title}</h3>
                <ul className="mt-3 space-y-1 flex-1">
                  {p.inside.map((line) => (
                    <li key={line} className="text-[11px] text-muted-foreground flex items-start gap-1.5 leading-snug">
                      <CheckCircle2 className="w-3 h-3 text-primary/70 mt-0.5 shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-1.5 transition-all">
                  {verified ? "Download" : "Unlock free"} <ArrowRight className="w-3 h-3" />
                </div>
              </a>
            );
          })}
        </div>

        {!verified ? (
          <div className="mt-10 max-w-md mx-auto text-center">
            <button
              onClick={() => {
                setPendingFile(null);
                setPendingTitle(null);
                setGateOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full text-sm font-semibold hover:opacity-90"
            >
              <Lock className="w-4 h-4" /> Verify to unlock all playbooks
            </button>
            <p className="text-[11px] text-muted-foreground mt-2">
              Quick email + mobile verification. We won't spam you.
            </p>
          </div>
        ) : (
          <div className="mt-10 max-w-md mx-auto rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
            <CheckCircle2 className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="font-display font-bold text-lg">You're verified</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click any card above to download. Your access is saved for 30 days.
            </p>
          </div>
        )}

        <PlaybookGateDialog
          open={gateOpen}
          onOpenChange={setGateOpen}
          pendingFile={pendingFile}
          pendingTitle={pendingTitle}
          onVerified={() => setVerified(true)}
        />
      </div>
    </section>
  );
}
