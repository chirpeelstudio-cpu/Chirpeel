import { Button } from "@/components/ui/button";
import { Plus, type LucideIcon } from "lucide-react";

interface Props {
  onClick: () => void;
  label?: string;
  icon?: LucideIcon;
}

/**
 * Mobile-only floating action button. Hidden on md+ where toolbar buttons exist.
 * Positioned above the bottom nav with safe-area padding.
 */
export function MobileFAB({ onClick, label = "Add", icon: Icon = Plus }: Props) {
  return (
    <Button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="md:hidden fixed right-4 z-40 h-14 px-5 rounded-full shadow-lg shadow-primary/30 gap-2"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
    >
      <Icon className="w-5 h-5" />
      <span className="font-semibold">{label}</span>
    </Button>
  );
}
