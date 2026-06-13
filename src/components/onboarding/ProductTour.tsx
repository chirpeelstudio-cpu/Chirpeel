import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOUR_STEPS, type TourStep, type TourSubStep } from "./tour-steps";
import type { AdminView } from "@/components/admin/AdminSidebar";
import type { Permissions } from "@/hooks/useCurrentUserPermissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface Props {
  open: boolean;
  permissions: Permissions;
  onChangeView: (v: AdminView) => void;
  onClose: (markComplete: boolean) => void;
}

interface AnchorRect { top: number; left: number; width: number; height: number; }
interface FlatStep {
  step: TourStep;
  sub: TourSubStep;
  moduleIdx: number;       // 0-based index among permitted modules
  subIdx: number;          // 0-based within current module
  subTotal: number;        // total subSteps in current module
}

const CARD_W = 340;
const GAP = 14;

export default function ProductTour({ open, permissions, onChangeView, onClose }: Props) {
  const isMobile = useIsMobile();

  // Permitted modules → flat list of (step, subStep) pairs.
  const flat = useMemo<FlatStep[]>(() => {
    const modules = TOUR_STEPS.filter((s) => permissions[s.perm]);
    const out: FlatStep[] = [];
    modules.forEach((step, moduleIdx) => {
      // On mobile, drop sub-steps that anchor to the sidebar item itself —
      // those nodes only exist while the mobile Sheet is open, which would
      // cover the page. The remaining sub-steps point at real in-page anchors.
      const subs = isMobile
        ? step.subSteps.filter((s) => s.anchor !== step.view)
        : step.subSteps;
      if (subs.length === 0) return;
      subs.forEach((sub, subIdx) => {
        out.push({ step, sub, moduleIdx, subIdx, subTotal: subs.length });
      });
    });
    return out;
  }, [permissions, isMobile]);
  const moduleCount = useMemo(
    () => TOUR_STEPS.filter((s) => permissions[s.perm]).length,
    [permissions]
  );

  const [idx, setIdx] = useState(0);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipSize, setTooltipSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardRect, setCardRect] = useState<{ left: number; top: number; right: number; bottom: number } | null>(null);
  const flatRef = useRef(flat);

  useEffect(() => {
    flatRef.current = flat;
    setIdx((currentIdx) => Math.min(currentIdx, Math.max(flat.length - 1, 0)));
  }, [flat]);

  useEffect(() => { if (open) setIdx(0); }, [open]);

  // If a modal sidebar/sheet overlay is still fading out, hide it during the tour
  // so the dashboard never appears blank behind the tour card.
  useEffect(() => {
    if (!open) return;
    const style = document.createElement("style");
    style.setAttribute("data-tour-overlay-guard", "true");
    style.textContent = `
      body:has([role="dialog"] [data-sidebar="sidebar"])[data-product-tour-open="true"] [data-radix-dialog-overlay] { display: none !important; }
      body[data-product-tour-open="true"] { pointer-events: auto !important; }
    `;
    document.head.appendChild(style);
    document.body.dataset.productTourOpen = "true";
    return () => {
      delete document.body.dataset.productTourOpen;
      style.remove();
    };
  }, [open]);

  // Switch the dashboard view whenever the active module changes.
  const currentView = flat[idx]?.step.view;
  useEffect(() => {
    if (!open || !currentView) return;
    onChangeView(currentView);
  }, [open, currentView, onChangeView]);

  const goToStep = useCallback((direction: 1 | -1) => {
    setIdx((currentIdx) => {
      const maxIdx = Math.max(flatRef.current.length - 1, 0);
      return Math.min(Math.max(currentIdx + direction, 0), maxIdx);
    });
  }, []);

  // Locate the in-page anchor (with sidebar fallback) and watch for it to mount.
  useLayoutEffect(() => {
    if (!open || !flat[idx]) return;
    const target = flat[idx].sub.anchor;
    const fallback = flat[idx].step.view;
    let raf = 0;
    let stopObserver: (() => void) | null = null;

    const measure = (opts?: { autoScroll?: boolean }) => {
      const el =
        document.querySelector<HTMLElement>(`main [data-tour-id="${target}"]`) ||
        (!isMobile ? document.querySelector<HTMLElement>(`[data-tour-id="${fallback}"]`) : null) ||
        (!isMobile ? document.querySelector<HTMLElement>(`[data-tour-id="take-tour"]`) : null);
      if (!el) { setAnchor(null); return; }
      // Only auto-scroll on initial mount / step change — never while the user is scrolling.
      if (opts?.autoScroll) {
        try { el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" }); } catch { /* ignore */ }
      }
      const r = el.getBoundingClientRect();
      // Minimum-distance threshold: ignore sub-pixel jitter from scroll/resize events
      // so the pill doesn't reflow on every frame.
      setAnchor((prev) => {
        if (
          prev &&
          Math.abs(prev.top - r.top) < 2 &&
          Math.abs(prev.left - r.left) < 2 &&
          Math.abs(prev.width - r.width) < 2 &&
          Math.abs(prev.height - r.height) < 2
        ) return prev;
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      });
    };
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => measure()); };

    measure({ autoScroll: true });
    // Modules render lazily — re-measure a few times.
    // Includes a ~300ms tick to re-measure after the radix Sheet's close animation finishes on mobile.
    const timers = [80, 220, 320, 450, 800].map((ms) => setTimeout(() => measure({ autoScroll: true }), ms));

    // Watch the DOM for the anchor showing up (e.g. tab content mounting).
    const obs = new MutationObserver(() => {
      if (document.querySelector(`[data-tour-id="${target}"]`)) schedule();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    stopObserver = () => obs.disconnect();

    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      stopObserver?.();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [open, idx, flat, isMobile]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToStep(1);
      else if (e.key === "ArrowLeft") goToStep(-1);
      else if (e.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goToStep, onClose]);

  // Reset measured tooltip size whenever the active sub-step changes — must run before early returns.
  useLayoutEffect(() => {
    setTooltipSize({ w: 0, h: 0 });
  }, [idx]);

  // After the pill mounts/updates, measure its actual rendered box and re-clamp.
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (Math.abs(r.width - tooltipSize.w) > 0.5 || Math.abs(r.height - tooltipSize.h) > 0.5) {
      setTooltipSize({ w: r.width, h: r.height });
    }
  });

  // Measure the actual tour card rect each render (and on scroll/resize) so collision
  // detection uses the real DOM box instead of an estimated height.
  useLayoutEffect(() => {
    if (!open) return;
    let raf = 0;
    const measureCard = () => {
      const el = cardRef.current;
      if (!el) { setCardRect(null); return; }
      const r = el.getBoundingClientRect();
      setCardRect((prev) => {
        if (
          prev &&
          Math.abs(prev.left - r.left) < 0.5 &&
          Math.abs(prev.top - r.top) < 0.5 &&
          Math.abs(prev.right - r.right) < 0.5 &&
          Math.abs(prev.bottom - r.bottom) < 0.5
        ) return prev;
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      });
    };
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measureCard); };
    schedule();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    // Watch for content changes inside the card that could resize it (e.g. body text length).
    const ro = typeof ResizeObserver !== "undefined" && cardRef.current
      ? new ResizeObserver(schedule) : null;
    if (ro && cardRef.current) ro.observe(cardRef.current);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      ro?.disconnect();
    };
  }, [open, idx]);

  if (!open || flat.length === 0) return null;

  const current = flat[idx];
  const { step, sub, moduleIdx, subIdx, subTotal } = current;
  const Icon = step.icon;
  const isLast = idx === flat.length - 1;

  const finish = () => {
    onClose(true);
    toast.success("You're ready!", { description: "Replay the tour anytime from the sidebar." });
  };

  // Compute card position — prefer the side with most space; for wide anchors, place below.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const CARD_H_EST = 290;

  let cardStyle: React.CSSProperties;
  if (isMobile) {
    cardStyle = {
      position: "fixed",
      left: 8,
      right: 8,
      bottom: 12,
      maxHeight: "55vh",
      zIndex: 60,
    };
  } else if (anchor) {
    const wide = anchor.width > vw * 0.55;
    const rightSpace = vw - (anchor.left + anchor.width);
    const bottomSpace = vh - (anchor.top + anchor.height);
    let top: number; let left: number;
    if (wide || rightSpace < CARD_W + GAP + 8) {
      // Place below if there's room, else above.
      if (bottomSpace > CARD_H_EST + GAP + 8) {
        top = Math.min(vh - CARD_H_EST - 8, anchor.top + anchor.height + GAP);
      } else {
        top = Math.max(8, anchor.top - CARD_H_EST - GAP);
      }
      left = Math.min(vw - CARD_W - 8, Math.max(8, anchor.left + anchor.width / 2 - CARD_W / 2));
    } else {
      // Place to the right.
      left = Math.min(vw - CARD_W - 8, anchor.left + anchor.width + GAP);
      top = Math.min(vh - CARD_H_EST - 8, Math.max(8, anchor.top));
    }
    cardStyle = { position: "fixed", top, left, width: CARD_W, zIndex: 60 };
  } else {
    cardStyle = { position: "fixed", right: 16, bottom: 16, width: CARD_W, zIndex: 60 };
  }

  const showRing = !!anchor && !isMobile;

  return createPortal(
    <>
      {showRing && (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse transition-all duration-300"
          style={{
            top: anchor!.top - 4,
            left: anchor!.left - 4,
            width: anchor!.width + 8,
            height: anchor!.height + 8,
            zIndex: 59,
          }}
        />
      )}

      {/* Compact tooltip pill anchored to the highlight — never overlaps the ring or main card. */}
      {showRing && sub.why && (() => {
        const MAX_W = 260;           // hard cap on pill width
        // Use the measured width when available; otherwise fall back to MAX_W so first paint is safe.
        const TT_W = Math.min(MAX_W, tooltipSize.w > 0 ? tooltipSize.w : MAX_W);
        const TT_H = tooltipSize.h > 0 ? tooltipSize.h : 32;
        const PAD = 10;              // gap between pill and ring
        const ringTop = anchor!.top - 4;
        const ringLeft = anchor!.left - 4;
        const ringRight = ringLeft + anchor!.width + 8;
        const ringBottom = ringTop + anchor!.height + 8;

        // Use the live-measured card rect when available; fall back to cardStyle math on first paint.
        const cardLeft   = cardRect?.left   ?? (cardStyle.left as number) ?? (vw - ((cardStyle.width as number) ?? CARD_W) - 16);
        const cardTop    = cardRect?.top    ?? (cardStyle.top  as number) ?? (vh - CARD_H_EST - 16);
        const cardRight  = cardRect?.right  ?? (cardLeft + ((cardStyle.width as number) ?? CARD_W));
        const cardBottom = cardRect?.bottom ?? (cardTop + CARD_H_EST);

        const overlaps = (l: number, t: number, w: number, h: number) =>
          !(l + w < cardLeft || l > cardRight || t + h < cardTop || t > cardBottom);

        const inViewport = (l: number, t: number, w: number, h: number) =>
          l >= 8 && t >= 8 && l + w <= vw - 8 && t + h <= vh - 8;

        // Build candidates in priority order: above, below, right, left of the ring.
        const cx = (ringLeft + ringRight) / 2;
        const cy = (ringTop + ringBottom) / 2;
        // Hard clamp: never let the pill render off-screen, regardless of text length.
        const clampX = (x: number) => Math.min(Math.max(8, vw - TT_W - 8), Math.max(8, x));
        const clampY = (y: number) => Math.min(Math.max(8, vh - TT_H - 8), Math.max(8, y));

        const candidates = [
          { side: "above", left: clampX(cx - TT_W / 2), top: ringTop - TT_H - PAD },
          { side: "below", left: clampX(cx - TT_W / 2), top: ringBottom + PAD },
          { side: "right", left: ringRight + PAD, top: clampY(cy - TT_H / 2) },
          { side: "left",  left: ringLeft - TT_W - PAD, top: clampY(cy - TT_H / 2) },
        ];

        // Pick the first one that fits AND doesn't overlap the card or the ring.
        const ringOverlaps = (l: number, t: number, w: number, h: number) =>
          !(l + w < ringLeft || l > ringRight || t + h < ringTop || t > ringBottom);

        let pick = candidates.find((c) =>
          inViewport(c.left, c.top, TT_W, TT_H) &&
          !overlaps(c.left, c.top, TT_W, TT_H) &&
          !ringOverlaps(c.left, c.top, TT_W, TT_H)
        );

        // Fallback 1: any in-viewport position that doesn't overlap the card (allow ring overlap is forbidden but
        // we relax viewport-side preference). Try a narrow pill (auto width) inside available gap.
        if (!pick) {
          pick = candidates.find((c) =>
            inViewport(c.left, c.top, TT_W, TT_H) && !overlaps(c.left, c.top, TT_W, TT_H)
          );
        }

        // Fallback 2: dock to a corner that's clear of both ring and card.
        if (!pick) {
          const corners = [
            { side: "tl", left: 8, top: 8 },
            { side: "tr", left: vw - TT_W - 8, top: 8 },
            { side: "bl", left: 8, top: vh - TT_H - 8 },
            { side: "br", left: vw - TT_W - 8, top: vh - TT_H - 8 },
          ];
          pick = corners.find((c) =>
            !overlaps(c.left, c.top, TT_W, TT_H) && !ringOverlaps(c.left, c.top, TT_W, TT_H)
          ) ?? corners[0];
        }

        return (
          <div
            ref={tooltipRef}
            aria-hidden
            className="pointer-events-none fixed rounded-full bg-foreground text-background text-[11px] font-medium px-3 py-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-200 transition-[top,left] ease-out motion-reduce:transition-none motion-reduce:animate-none motion-reduce:fade-in-0 motion-reduce:slide-in-from-bottom-0"
            style={{
              top: clampY(pick.top),
              left: clampX(pick.left),
              maxWidth: MAX_W,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              zIndex: 60,
              transitionDuration: "220ms",
            }}
          >
            {sub.why}
          </div>
        );
      })()}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        style={cardStyle}
        className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3 border-b border-border bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="w-3 h-3" />
              {step.title} · Step {subIdx + 1}/{subTotal}
            </div>
            <h2 id="tour-title" className="text-sm font-bold text-foreground mt-0.5 truncate">{sub.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            aria-label="Skip tour"
            className="shrink-0 text-muted-foreground hover:text-foreground rounded-md p-1 -m-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-2.5 overflow-y-auto" style={{ maxHeight: isMobile ? "32vh" : 220 }}>
          <p className="text-sm text-foreground">{sub.body}</p>
          {subIdx === 0 && (
            <p className="text-xs text-muted-foreground italic">{step.intro}</p>
          )}
          {sub.tip && (
            <div className="text-xs p-2.5 rounded-lg bg-accent/10 border border-accent/30 text-foreground">
              <span className="font-semibold">Try it: </span>{sub.tip}
            </div>
          )}
          {isMobile && !anchor && (
            <div className="text-[11px] text-muted-foreground italic">
              Tip: scroll the page to bring the highlighted area into view.
            </div>
          )}
        </div>

        {/* Two-level progress: a dot per module + sub-step pips for current module */}
        <div className="px-4 pb-2 space-y-1.5">
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: moduleCount }).map((_, m) => (
              <span
                key={m}
                className={`h-1.5 rounded-full transition-all ${
                  m < moduleIdx ? "w-3 bg-primary/60" :
                  m === moduleIdx ? "w-6 bg-primary" :
                  "w-3 bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: subTotal }).map((_, s) => (
              <span
                key={s}
                className={`h-1 w-1 rounded-full transition-all ${
                  s === subIdx ? "bg-primary scale-150" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-3 border-t border-border bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(-1)}
            disabled={idx === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <button
            type="button"
            onClick={() => onClose(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          {isLast ? (
            <Button size="sm" onClick={finish}>
              Finish <Check className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => goToStep(1)}>
              Next <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}