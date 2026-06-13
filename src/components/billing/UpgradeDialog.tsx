import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import PlanPicker from "./PlanPicker";
import {
  PLAN_LABEL,
  actionLabel,
  limitFor,
  limitLabel,
  nextPlanFor,
  type LimitKind,
  type PlanId,
} from "@/lib/planEntitlements";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: LimitKind;
  currentPlan: PlanId;
  currentUsage: number;
}

export default function UpgradeDialog({ open, onOpenChange, kind, currentPlan, currentUsage }: Props) {
  const navigate = useNavigate();
  const target = nextPlanFor(kind, currentPlan);
  const currentLimit = limitFor(currentPlan, kind);
  const recommended: Exclude<PlanId, "free"> = target === "free" ? "pro" : (target as Exclude<PlanId, "free">);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Upgrade to continue
          </DialogTitle>
          <DialogDescription>
            You've reached your {PLAN_LABEL[currentPlan]} plan limit
            {Number.isFinite(currentLimit) ? ` of ${currentLimit} ${limitLabel(kind)}` : ""}
            {currentUsage > 0 ? ` (currently using ${currentUsage}).` : "."} Pick a plan to keep going.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <PlanPicker
            currentPlan={currentPlan}
            preselect={recommended}
            onSubscribed={() => onOpenChange(false)}
          />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Not now</Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              navigate("/studio/settings?tab=billing#upgrade");
            }}
          >
            Compare full plans
          </Button>
        </DialogFooter>
        <p className="sr-only">{actionLabel(kind)} blocked by plan limit.</p>
      </DialogContent>
    </Dialog>
  );
}