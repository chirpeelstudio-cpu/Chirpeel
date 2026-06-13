import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  /** Render inside a Card wrapper. Set false when used inside a TableCell. */
  asCard?: boolean;
  className?: string;
}

/**
 * Mobile-first empty state with a clear, centered CTA.
 * Tap target ≥44px, generous padding, friendly typography.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  asCard = true,
  className = "",
}: EmptyStateProps) {
  const inner = (
    <div
      className={`flex flex-col items-center justify-center text-center px-5 py-10 sm:py-12 ${className}`}
    >
      {Icon && (
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <p className="text-base sm:text-lg font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          size="lg"
          className="mt-5 w-full sm:w-auto min-h-11 px-6"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4 mr-1.5" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );

  if (!asCard) return inner;
  return <Card className="border-dashed">{inner}</Card>;
}
