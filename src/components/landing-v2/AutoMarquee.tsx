import { ReactNode, useState } from "react";

interface Props {
  children: ReactNode[];
  /** seconds for one full loop */
  duration?: number;
  /** "left" makes content scroll to the left (default) */
  direction?: "left" | "right";
}

/**
 * Auto-scrolling horizontal marquee.
 * - Duplicates children once for seamless loop.
 * - Pauses on hover (desktop) and on touch (mobile via :active on container).
 */
export default function AutoMarquee({ children, duration = 36, direction = "left" }: Props) {
  const loop = [...children, ...children];
  const [paused, setPaused] = useState(false);

  return (
    <div
      className="relative overflow-hidden group"
      onClick={() => setPaused((p) => !p)}
    >
      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 z-10 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l from-background to-transparent" />

      <div
        className="flex gap-3 w-max"
        style={{
          animation: `marquee-${direction} ${duration}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {loop.map((child, i) => (
          <div key={i} className="shrink-0 w-[78vw] sm:w-[320px] max-w-[340px]">
            {child}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
