import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WorkflowTimeline } from "./WorkflowTimeline";
import {
  ALLOWED_TRANSITIONS,
  WORKFLOW_BADGE_CLASS,
  WORKFLOW_LABEL,
  type WorkflowAction,
  type WorkflowStatus,
} from "./workflow-config";

interface Props {
  quotationId: string;
  workflowStatus: WorkflowStatus;
  isManager: boolean;
  onChanged: (newStatus: WorkflowStatus) => void;
  onSnapshot: (label?: string) => Promise<void>;
}

export const WorkflowPanel = ({ quotationId, workflowStatus, isManager, onChanged, onSnapshot }: Props) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [snapshotting, setSnapshotting] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<WorkflowAction | null>(null);
  const [note, setNote] = useState("");
  const [snapDialog, setSnapDialog] = useState(false);
  const [snapLabel, setSnapLabel] = useState("");

  const actions = ALLOWED_TRANSITIONS[workflowStatus] ?? [];

  const runTransition = async (action: WorkflowAction, providedNote?: string) => {
    setBusy(action.to);
    try {
      const { error } = await supabase.rpc("transition_quotation_workflow" as never, {
        _quotation_id: quotationId,
        _to: action.to,
        _note: providedNote || null,
      } as never);
      if (error) throw error;
      toast({ title: "Status updated", description: `Moved to ${WORKFLOW_LABEL[action.to]}` });
      onChanged(action.to);
      setTimelineKey((k) => k + 1);
      setPendingAction(null);
      setNote("");
    } catch (err) {
      toast({ title: "Transition failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleClick = (action: WorkflowAction) => {
    if (action.requiresNote || action.to === "rejected" || action.to === "approved") {
      setPendingAction(action);
      return;
    }
    runTransition(action);
  };

  const handleSnapshot = async () => {
    setSnapshotting(true);
    try {
      await onSnapshot(snapLabel.trim() || undefined);
      setSnapDialog(false);
      setSnapLabel("");
    } finally {
      setSnapshotting(false);
    }
  };

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={WORKFLOW_BADGE_CLASS[workflowStatus]}>{WORKFLOW_LABEL[workflowStatus]}</Badge>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {actions.map((a) => {
            const disabled = (a.managerOnly && !isManager) || busy !== null;
            return (
              <Button
                key={a.to}
                size="sm"
                variant={a.variant ?? "outline"}
                disabled={disabled}
                onClick={() => handleClick(a)}
                title={a.managerOnly && !isManager ? "Admin/manager only" : undefined}
              >
                {busy === a.to && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {a.label}
              </Button>
            );
          })}
          <Button size="sm" variant="ghost" onClick={() => setSnapDialog(true)}>
            <History className="w-4 h-4 mr-1" /> Save snapshot
          </Button>
        </div>
      </div>

      <div className="mt-4 border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Approval timeline
          </h3>
          <span className="text-[10px] text-muted-foreground">Newest first</span>
        </div>
        <WorkflowTimeline quotationId={quotationId} refreshKey={timelineKey} />
      </div>

      {/* Note dialog for approve/reject */}
      <Dialog open={!!pendingAction} onOpenChange={(o) => !o && setPendingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingAction?.label}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={pendingAction?.requiresNote ? "Reason (required)" : "Optional note"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)}>Cancel</Button>
            <Button
              onClick={() => pendingAction && runTransition(pendingAction, note)}
              disabled={busy !== null || (pendingAction?.requiresNote && !note.trim())}
            >
              {busy && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save snapshot dialog */}
      <Dialog open={snapDialog} onOpenChange={setSnapDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save snapshot</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Optional label (e.g. ‘Before discount’)"
            value={snapLabel}
            onChange={(e) => setSnapLabel(e.target.value)}
            rows={2}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapDialog(false)}>Cancel</Button>
            <Button onClick={handleSnapshot} disabled={snapshotting}>
              {snapshotting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
