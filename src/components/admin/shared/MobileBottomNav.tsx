import { LayoutDashboard, KanbanSquare, FileText, Briefcase, Plus, type LucideIcon } from "lucide-react";

export type BottomNavKey = "Overview" | "Pipeline" | "Quotations" | "Projects";

interface Item {
  key: BottomNavKey;
  label: string;
  icon: LucideIcon;
}

const ITEMS: Item[] = [
  { key: "Overview",   label: "Home",     icon: LayoutDashboard },
  { key: "Pipeline",   label: "Pipeline", icon: KanbanSquare },
  { key: "Quotations", label: "Quotes",   icon: FileText },
  { key: "Projects",   label: "Projects", icon: Briefcase },
];

interface Props {
  activeKey: string;
  onNavigate: (key: BottomNavKey) => void;
  onAddLead: () => void;
}

/**
 * Instagram-style fixed bottom nav for mobile only.
 * 5 slots: 2 left, raised primary "+" in center, 2 right.
 */
export function MobileBottomNav({ activeKey, onNavigate, onAddLead }: Props) {
  const left = ITEMS.slice(0, 2);
  const right = ITEMS.slice(2);

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-5 items-end h-16 px-1">
        {left.map((it) => (
          <NavButton key={it.key} item={it} active={activeKey === it.key} onClick={() => onNavigate(it.key)} />
        ))}

        <li className="flex justify-center">
          <button
            type="button"
            onClick={onAddLead}
            aria-label="Add Lead"
            className="-mt-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center ring-4 ring-background active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </li>

        {right.map((it) => (
          <NavButton key={it.key} item={it} active={activeKey === it.key} onClick={() => onNavigate(it.key)} />
        ))}
      </ul>
    </nav>
  );
}

function NavButton({ item, active, onClick }: { item: Item; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={`w-full h-16 flex flex-col items-center justify-center gap-0.5 transition-colors ${
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
        <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>
        <span
          className={`mt-0.5 h-1 w-1 rounded-full ${active ? "bg-primary" : "bg-transparent"}`}
          aria-hidden
        />
      </button>
    </li>
  );
}