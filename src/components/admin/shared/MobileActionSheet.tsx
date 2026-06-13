import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface MobileSheetAction {
  key: string;
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  href?: string; // tel:, mailto:, etc.
  variant?: "default" | "destructive" | "muted";
  disabled?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actions: MobileSheetAction[];
}

/**
 * Bottom-sheet action menu intended for mobile rows.
 * Built on top of vaul (shadcn Drawer). Auto-closes after an action runs.
 */
export function MobileActionSheet({ open, onOpenChange, title, description, actions }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-2 pb-3">
        <DrawerHeader className="px-3 pb-2">
          <DrawerTitle className="text-base truncate">{title}</DrawerTitle>
          {description && <DrawerDescription className="truncate">{description}</DrawerDescription>}
        </DrawerHeader>

        <div className="flex flex-col gap-1 px-2">
          {actions.filter(a => !a.disabled).map((a) => {
            const Icon = a.icon;
            const tone =
              a.variant === "destructive"
                ? "text-red-600 hover:bg-red-50"
                : a.variant === "muted"
                  ? "text-muted-foreground hover:bg-muted"
                  : "text-foreground hover:bg-muted";
            const handle = () => {
              a.onSelect?.();
              onOpenChange(false);
            };
            const inner = (
              <span className="flex items-center gap-3 w-full">
                {Icon ? <Icon className="w-4 h-4 shrink-0" /> : <span className="w-4" />}
                <span className="text-sm font-medium">{a.label}</span>
              </span>
            );
            if (a.href) {
              return (
                <a
                  key={a.key}
                  href={a.href}
                  onClick={() => onOpenChange(false)}
                  className={cn("rounded-md px-3 py-3 text-left", tone)}
                >
                  {inner}
                </a>
              );
            }
            return (
              <button
                key={a.key}
                type="button"
                onClick={handle}
                className={cn("rounded-md px-3 py-3 text-left", tone)}
              >
                {inner}
              </button>
            );
          })}
        </div>

        <DrawerFooter className="px-3 pt-2">
          <DrawerClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
