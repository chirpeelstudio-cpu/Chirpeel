import { cloneElement, isValidElement, useState, type MouseEvent, type ReactElement } from "react";
import { useEntitlements } from "@/hooks/useEntitlements";
import UpgradeDialog from "./UpgradeDialog";
import type { LimitKind } from "@/lib/planEntitlements";

interface Props {
  kind: LimitKind;
  /** Single trigger element (a Button, etc.). Its onClick is intercepted when over limit. */
  children: ReactElement;
  /** Optional: skip gating (e.g. for editing existing rows). */
  disabled?: boolean;
}

/**
 * Wraps a single creation trigger. If the user is over their plan's limit
 * for `kind`, the trigger opens an UpgradeDialog instead of running its
 * original onClick. UI-side gate; the DB trigger is the safety net.
 */
export default function UpgradeGate({ kind, children, disabled }: Props) {
  const ent = useEntitlements();
  const [open, setOpen] = useState(false);

  if (disabled || ent.loading) return children;

  const allowed = ent.canCreate(kind);

  const child = isValidElement<{ onClick?: (e: MouseEvent<HTMLElement>) => void }>(children)
    ? children
    : null;

  const wrapped = child
    ? cloneElement(child, {
        onClick: (e: MouseEvent<HTMLElement>) => {
          if (!allowed) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
            return;
          }
          child.props.onClick?.(e);
        },
      })
    : children;

  const usageMap: Record<LimitKind, number> = {
    lead: ent.usage.leadsThisMonth,
    quote: ent.usage.quotesThisMonth,
    project: ent.usage.activeProjects,
    team_member: ent.usage.teamMembers,
  };

  return (
    <>
      {wrapped}
      <UpgradeDialog
        open={open}
        onOpenChange={setOpen}
        kind={kind}
        currentPlan={ent.plan}
        currentUsage={usageMap[kind]}
      />
    </>
  );
}