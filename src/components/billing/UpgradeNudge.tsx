import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { useEntitlements } from "@/hooks/useEntitlements";
import { limitFor, type LimitKind } from "@/lib/planEntitlements";

const KEY = "chirpeel:upgrade-nudge:dismissed";

export default function UpgradeNudge() {
  const ent = useEntitlements();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(KEY) === "1";
  });

  if (dismissed || ent.loading || ent.plan !== "free") return null;

  const kinds: LimitKind[] = ["lead", "quote", "project"];
  const hot = kinds.find((k) => {
    const limit = limitFor("free", k);
    if (!Number.isFinite(limit)) return false;
    const used =
      k === "lead" ? ent.usage.leadsThisMonth :
      k === "quote" ? ent.usage.quotesThisMonth :
      ent.usage.activeProjects;
    return used / limit >= 0.7;
  });

  if (!hot) return null;

  const close = () => {
    sessionStorage.setItem(KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="mx-2 mb-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
      <div className="flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight">You're running low</p>
          <p className="text-muted-foreground mt-0.5">
            Upgrade for unlimited leads & quotations.
          </p>
          <button
            type="button"
            onClick={() => navigate("/studio/settings?tab=billing#upgrade")}
            className="mt-1.5 text-primary font-semibold hover:underline"
          >
            See plans →
          </button>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}