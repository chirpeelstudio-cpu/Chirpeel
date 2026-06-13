import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import { markTourComplete } from "./tourState";

export type TourStep = {
  /** value of data-tour attribute (only required for `kind="spotlight"`) */
  slug: string;
  /** Display label */
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** What this tool is */
  what: string;
  /** When to use it */
  when: string;
  /** "spotlight" anchors to a data-tour element; "chapter" is a centered card */
  kind?: "spotlight" | "chapter";
  /** Optional route to navigate to before showing the step */
  route?: string;
  /** Eyebrow label shown above the title (defaults vary by kind) */
  eyebrow?: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8;
const TOOLTIP_W = 320;
const TOOLTIP_GAP = 16;

function getRect(slug: string): Rect | null {
  // Prefer a visible match (mobile sheet vs desktop sidebar both render the
  // same data-tour attribute — pick whichever is on screen).
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${slug}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
  }
  return null;
}

export function SidebarSpotlightTour({
  open,
  steps,
  onClose,
  onStepEnter,
}: {
  open: boolean;
  steps: TourStep[];
  onClose: () => void;
  /** Called whenever a new step becomes active. Use to open mobile sidebar / scroll target into view. */
  onStepEnter?: (step: TourStep, index: number) => void;
}) {
  // -1 = intro card, steps.length = closing card
  const [idx, setIdx] = useState(-1);
  const [rect, setRect] = useState<Rect | null>(null);
  const tickRef = useRef<number | null>(null);
  const [pulseKey, setPulseKey] = useState(0);

  const total = steps.length;
  const isIntro = idx === -1;
  const isOutro = idx === total;
  const step = !isIntro && !isOutro ? steps[idx] : null;
  const isChapter = step?.kind === "chapter";
  const isSpotlight = !!step && step.kind !== "chapter";

  useEffect(() => {
    if (open) setIdx(-1);
  }, [open]);

  // Notify host when ANY step opens (chapter or spotlight) so it can route
  // the underlying screen / open the mobile drawer.
  useEffect(() => {
    if (!open || !step) return;
    onStepEnter?.(step, idx);
  }, [open, idx, step, onStepEnter]);

  // Recompute the spotlight rect whenever the step / viewport changes.
  useLayoutEffect(() => {
    if (!open || !isSpotlight || !step) { setRect(null); return; }
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const r = getRect(step.slug);
      if (r) {
        setRect(r);
        setPulseKey(k => k + 1);
      } else {
        // anchor not in DOM yet — keep polling briefly
        tickRef.current = window.setTimeout(tick, 80);
      }
    };
    tick();

    const onChange = () => {
      const r = getRect(step.slug);
      if (r) setRect(r);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      cancelled = true;
      if (tickRef.current) window.clearTimeout(tickRef.current);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [open, step, isSpotlight]);

  const finish = () => {
    markTourComplete();
    onClose();
    setIdx(-1);
  };

  const next = () => {
    if (isOutro) { finish(); return; }
    setIdx(i => i + 1);
  };
  const back = () => setIdx(i => Math.max(-1, i - 1));

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idx]);

  // Tooltip position — anchored next to the rect; centered for intro/outro/chapter
  const tooltipStyle = useMemo<React.CSSProperties>(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!rect || !step || isChapter) {
      // Centered card
      return {
        top: Math.max(24, vh / 2 - 160),
        left: Math.max(16, vw / 2 - TOOLTIP_W / 2),
        width: TOOLTIP_W,
      };
    }
    // Prefer right of the rect; flip below on narrow screens
    const fitsRight = rect.left + rect.width + TOOLTIP_GAP + TOOLTIP_W < vw - 8;
    if (fitsRight) {
      return {
        top: Math.min(Math.max(16, rect.top), vh - 280),
        left: rect.left + rect.width + TOOLTIP_GAP,
        width: TOOLTIP_W,
      };
    }
    // place below; clamp horizontally to viewport
    const left = Math.min(Math.max(8, rect.left), vw - TOOLTIP_W - 8);
    const top = Math.min(rect.top + rect.height + TOOLTIP_GAP, vh - 280);
    return { top, left, width: Math.min(TOOLTIP_W, vw - 16) };
  }, [rect, step, isChapter]);

  // Side from which the tooltip should slide in based on its placement vs the rect.
  const slideClass = useMemo(() => {
    if (!rect || !step || isChapter) return "animate-scale-in";
    const vw = window.innerWidth;
    const fitsRight = rect.left + rect.width + TOOLTIP_GAP + TOOLTIP_W < vw - 8;
    return fitsRight ? "animate-slide-in-right" : "animate-fade-in-up";
  }, [rect, step, isChapter]);

  if (!open) return null;

  const Icon = step?.icon;
  const stepNum = isIntro ? 0 : isOutro ? total + 1 : idx + 1;
  const stepCount = total + 2; // intro + steps + outro

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto" aria-modal="true" role="dialog">
      {/* Dim layer that covers everything except the spotlight rect.
          When no rect (intro/outro/chapter) we just dim the whole screen. */}
      {rect && isSpotlight ? (
        <div
          key={pulseKey}
          className="fixed pointer-events-none transition-[top,left,width,height] duration-300 ease-out animate-tour-pulse-ring"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            borderRadius: 12,
            boxShadow: "0 0 0 9999px hsl(var(--background) / 0.75)",
            outline: "3px solid hsl(var(--primary))",
            outlineOffset: 0,
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-background/75 animate-fade-in" />
      )}

      {/* Click-catcher to dismiss on outside click of the tooltip card */}
      <div className="fixed inset-0" onClick={finish} aria-hidden />

      {/* Tooltip card — keyed on idx so it remounts and the entry animation re-runs each step */}
      <div
        key={`card-${idx}`}
        className={`fixed bg-card text-card-foreground border border-border rounded-xl shadow-2xl p-4 space-y-3 opacity-0 ${slideClass}`}
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {Icon ? (
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 animate-scale-in">
                <Icon className="w-4 h-4" />
              </span>
            ) : (
              <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold animate-scale-in">
                {isIntro ? <Sparkles className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              </span>
            )}
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {isIntro
                  ? "Welcome"
                  : isOutro
                  ? "All done"
                  : step?.eyebrow ?? (isChapter ? "Chapter" : `Step ${idx + 1} of ${total}`)}
              </div>
              <div className="font-display font-semibold text-base leading-tight truncate">
                {isIntro ? "Let's tour your studio" : isOutro ? "You're ready to go" : step!.label}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={finish}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-sm leading-relaxed text-foreground/90 space-y-2">
          {isIntro && (
            <>
              <p>
                We'll walk through each item in your sidebar so you know exactly
                what every tool does and when to use it.
              </p>
              <p className="text-muted-foreground text-xs">
                Takes about 60 seconds. Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Esc</kbd> any time to skip.
              </p>
            </>
          )}
          {step && !isChapter && (
            <>
              <p><span className="font-semibold text-foreground">What it is:</span> {step.what}</p>
              <p><span className="font-semibold text-foreground">When to use:</span> {step.when}</p>
            </>
          )}
          {step && isChapter && (
            <>
              <p>{step.what}</p>
              {step.when && <p className="text-muted-foreground text-xs">{step.when}</p>}
            </>
          )}
          {isOutro && (
            <>
              <p>That's every tool. Sample DEMO data is loaded so you can experiment without breaking anything.</p>
              <p className="text-muted-foreground text-xs">
                Wipe it anytime from <span className="font-semibold text-foreground">Settings → About → Clear demo data</span>.
              </p>
            </>
          )}
        </div>

        {/* Step pips */}
        <div className="flex items-center gap-1 pt-1">
          {Array.from({ length: stepCount }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepNum ? "bg-primary w-5" : i < stepNum ? "bg-primary/40 w-1.5" : "bg-muted w-1.5"
              }`}
            />
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground">{stepNum + 1} / {stepCount}</span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={finish} className="text-muted-foreground">
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            {!isIntro && (
              <Button variant="outline" size="sm" onClick={back}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {isOutro ? (
              <Button size="sm" onClick={finish}>
                <Check className="w-4 h-4 mr-1.5" /> Got it
              </Button>
            ) : (
              <Button size="sm" onClick={next}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}