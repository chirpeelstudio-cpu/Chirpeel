import type { CSSProperties, ReactNode } from "react";

/**
 * Cascading entry-animation wrapper used inside each onboarding step.
 * Each item fades in with `index * 50ms` delay so fields appear one after another.
 * Uses the existing `animate-fade-in-up` keyframe — no new CSS needed.
 */
export default function StaggerItem({
  index = 0,
  children,
  className,
  as: As = "div",
  style,
}: {
  index?: number;
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "section";
  style?: CSSProperties;
}) {
  return (
    <As
      className={`opacity-0 animate-fade-in-up ${className ?? ""}`}
      style={{ animationDelay: `${index * 50}ms`, ...style }}
    >
      {children}
    </As>
  );
}