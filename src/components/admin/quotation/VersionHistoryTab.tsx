import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, RotateCcw, GitCompare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "./types";
import { VersionCompareDialog } from "./VersionCompareDialog";
import type { QuotationVersion } from "./workflow-config";

interface Props {
  quotationId: string;
  refreshKey?: number;
  onRestored: () => void;
}

export const VersionHistoryTab = ({ quotationId, refreshKey = 0, onRestored }: Props) => {
  const { toast } = useToast();
  const [versions, setVersions] = useState<QuotationVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<QuotationVersion | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quotation_versions" as never)
      .select("*")
      .eq("quotation_id", quotationId)
      .order("version_number", { ascending: false });
    if (error) {
      toast({ title: "Failed to load versions", description: error.message, variant: "destructive" });
    }
    setVersions((data ?? []) as unknown as QuotationVersion[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [quotationId, refreshKey]);

  const toggle = (id: string) => {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 2) return [s[1], id];
      return [...s, id];
    });
  };

  const va = versions.find((v) => v.id === selected[0]) ?? null;
  const vb = versions.find((v) => v.id === selected[1]) ?? null;

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      // Safety snapshot of current state first
      await supabase.rpc("snapshot_quotation" as never, {
        _quotation_id: quotationId,
        _label: `Auto-snapshot before restore of v${restoreTarget.version_number}`,
        _trigger: "restore",
      } as never);

      // Build payload for save_quotation: keep current id, push snapshot rooms back
      const snap = restoreTarget.snapshot as { header: any; rooms: any[] };
      const payload = {
        header: { ...snap.header, id: quotationId, status: "draft" },
        rooms: snap.rooms ?? [],
      };
      const { error } = await supabase.rpc("save_quotation" as never, { payload } as never);
      if (error) throw error;

      // Reset workflow back to draft
      await supabase
        .from("quotations")
        .update({ workflow_status: "draft" } as never)
        .eq("id", quotationId);

      toast({
        title: "Restored",
        description: `Loaded v${restoreTarget.version_number} as a new draft (safety snapshot saved).`,
      });
      setRestoreTarget(null);
      onRestored();
    } catch (err) {
      toast({ title: "Restore failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Select two versions to compare. Snapshots are created on every Send and via the Save Snapshot button.
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={selected.length !== 2}
          onClick={() => setCompareOpen(true)}
        >
          <GitCompare className="w-4 h-4 mr-1" /> Compare selected
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading versions…
        </div>
      ) : versions.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No snapshots yet. Click <span className="font-medium">Save snapshot</span> in the workflow panel or send the quotation to create one.
        </Card>
      ) : (
        <Card className="divide-y">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center gap-3 p-3">
              <Checkbox
                checked={selected.includes(v.id)}
                onCheckedChange={() => toggle(v.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">v{v.version_number}</span>
                  <Badge variant="outline" className="capitalize">{v.trigger}</Badge>
                  {v.label && <span className="text-sm">{v.label}</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleString()} {v.created_by ? `· ${v.created_by}` : ""}
                </div>
              </div>
              <div className="text-sm font-mono mr-3">{formatINR(v.total_amount)}</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRestoreTarget(v)}
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Restore
              </Button>
            </div>
          ))}
        </Card>
      )}

      <VersionCompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        versionA={va}
        versionB={vb}
      />

      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore v{restoreTarget?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              The current state will be saved as a safety snapshot first, then this version will be loaded back into the builder as a draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoring}>
              {restoring && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
