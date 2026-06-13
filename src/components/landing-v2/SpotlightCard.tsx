import { useRef, ReactNode } from "react";

interface Props {
  children: ReactNode;
  tone?: "destructive" | "primary";
  className?: string;
}

/**
 * Card with a cursor-tracking radial spotlight + magnetic tilt (desktop).
 * On touch devices: a soft static gradient is always visible for visual interest,
 * and the tilt is disabled.
 */
export default function SpotlightCard({ children, tone = "primary", className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    // Only run pointer effects on fine pointers (desktop)
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    const rx = ((y / rect.height) - 0.5) * -4;
    const ry = ((x / rect.width) - 0.5) * 4;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  };

  const glow =
    tone === "destructive"
      ? "radial-gradient(280px circle at var(--mx,50%) var(--my,50%), hsl(var(--destructive) / 0.18), transparent 60%)"
      : "radial-gradient(280px circle at var(--mx,50%) var(--my,50%), hsl(var(--primary) / 0.22), transparent 60%)";

  // Always-on soft gradient for touch devices (mobile/tablet)
  const staticGlow =
    tone === "destructive"
      ? "radial-gradient(120% 80% at 0% 0%, hsl(var(--destructive) / 0.08), transparent 55%)"
      : "radial-gradient(120% 80% at 0% 0%, hsl(var(--primary) / 0.1), transparent 55%)";

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transform: "perspective(900px) rotateX(var(--rx,0)) rotateY(var(--ry,0))",
        transition: "transform 250ms ease-out",
      }}
      className={`group relative rounded-2xl border border-border bg-card p-5 sm:p-6 overflow-hidden ${className}`}
    >
      {/* Static soft gradient — visible on touch, hidden on desktop hover paths */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 sm:opacity-100"
        style={{ background: staticGlow }}
      />
      {/* Cursor spotlight (desktop hover only) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 [@media(pointer:fine)]:group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: glow }}
      />
      {/* Border glow on hover */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 [@media(pointer:fine)]:group-hover:opacity-100 transition-opacity duration-300 ${
          tone === "destructive"
            ? "shadow-[inset_0_0_0_1px_hsl(var(--destructive)/0.35)]"
            : "shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.45)]"
        }`}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
