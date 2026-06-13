import { Badge } from "@/components/ui/badge";

const MARKER = "[DEMO";

/** Renders a small "DEMO" pill when the provided text contains the seed marker. */
export function DemoBadge({ from, className = "" }: { from?: string | null; className?: string }) {
  if (!from || !from.includes(MARKER)) return null;
  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 h-4 border-amber-400/60 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 ${className}`}
    >
      DEMO
    </Badge>
  );
}