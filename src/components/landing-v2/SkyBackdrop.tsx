import { ReactNode } from "react";

interface Props {
  variant?: "full" | "soft" | "grass";
  className?: string;
  children?: ReactNode;
}

/** Layered sky → horizon → grass background. */
export default function SkyBackdrop({ variant = "full", className = "", children }: Props) {
  const cls =
    variant === "soft" ? "bg-sky-soft" : variant === "grass" ? "bg-grass" : "bg-sky-day";
  return (
    <div className={`relative isolate overflow-hidden ${cls} ${className}`}>
      {/* Subtle clouds */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(800px 220px at 18% 18%, hsl(0 0% 100% / 0.55), transparent 60%)," +
            "radial-gradient(700px 200px at 78% 12%, hsl(0 0% 100% / 0.45), transparent 60%)," +
            "radial-gradient(600px 180px at 50% 28%, hsl(0 0% 100% / 0.35), transparent 60%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}