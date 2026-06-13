import { useEffect, useRef, useState } from "react";

/**
 * Lightweight Cursor.com-style scripted animation engine.
 * - rAF loop driven by performance.now()
 * - IntersectionObserver pauses the loop when off-screen
 * - prefers-reduced-motion → returns t=1 (final frame), no cursor
 */
export function useScriptedClock(durationMs: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState(0); // normalized 0..1
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.35 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      setT(1);
      return;
    }
    if (!visible) return;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const now = performance.now();
      const elapsed = (now - start) % durationMs;
      setT(elapsed / durationMs);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, reduced, durationMs]);

  return { ref, t, reduced };
}

/** Cubic ease-in-out */
export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Linear interpolation */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

/** Animate a path: list of waypoints with normalized timing windows */
export type Waypoint = { x: number; y: number; from: number; to: number; click?: boolean };

export function cursorPosition(waypoints: Waypoint[], t: number) {
  // Find current segment
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (t >= a.to && t <= b.from) {
      // Hold at a between segments
      return { x: a.x, y: a.y, click: false, holding: a.click };
    }
    if (t >= b.from && t <= b.to) {
      const local = (t - b.from) / (b.to - b.from);
      const e = ease(local);
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), click: false, holding: false };
    }
  }
  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];
  if (t < first.from) return { x: first.x, y: first.y, click: false, holding: false };
  return { x: last.x, y: last.y, click: false, holding: last.click };
}

/** Returns true during a brief window after `at` — used for click ripple flashes */
export function pulseAt(t: number, at: number, width = 0.04) {
  return t >= at && t <= at + width;
}

export function Cursor({
  x,
  y,
  click,
  hidden,
}: {
  x: number; // percent 0..100
  y: number; // percent 0..100
  click?: boolean;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-2px, -2px)",
        willChange: "transform, left, top",
        transition: "none",
      }}
      aria-hidden
    >
      {/* Click ripple */}
      <div
        className="absolute rounded-full border-2 border-primary"
        style={{
          left: -10,
          top: -10,
          width: 28,
          height: 28,
          opacity: click ? 0.8 : 0,
          transform: `scale(${click ? 1.6 : 0.4})`,
          transition: "opacity 220ms ease-out, transform 220ms ease-out",
        }}
      />
      {/* Cursor SVG */}
      <svg width="20" height="22" viewBox="0 0 20 22" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}>
        <path
          d="M2 2 L2 16 L6.5 12 L9 18 L11.5 17 L9 11 L15 11 Z"
          fill="white"
          stroke="hsl(var(--foreground))"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
