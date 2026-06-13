import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PO_STATUSES, PO_TIMELINE_STEPS, type PoStatusHistoryEntry, type PurchaseOrder } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  po: PurchaseOrder;
  onChanged?: (newStatus: string) => void;
}

export function POStatusTimeline({ po, onChanged }: Props) {
  const [history, setHistory] = useState<PoStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("po_status_history" as any)
      .select("*")
      .eq("purchase_order_id", po.id)
      .order("created_at", { ascending: true });
    setHistory(((data ?? []) as unknown as PoStatusHistoryEntry[]));
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [po.id]);

  // Status keys that have been reached, based on history + current status
  const reached = new Set<string>([po.status, ...history.map(h => h.to_status)]);

  const setStatus = async (next: string) => {
    if (next === po.status) return;
    setPending(next);
    const { data: prof } = await supabase.auth.getUser();
    const actor = prof.user?.email ?? null;
    const { error: upErr } = await supabase
      .from("purchase_orders" as any)
      .update({ status: next })
      .eq("id", po.id);
    if (upErr) { setPending(null); toast.error(upErr.message); return; }
    const { error: histErr } = await supabase.from("po_status_history" as any).insert({
      purchase_order_id: po.id,
      from_status: po.status,
      to_status: next,
      note: note.trim() || null,
      actor,
    });
    setPending(null);
    if (histErr) { toast.error(histErr.message); return; }
    setNote("");
    toast.success(`Marked as ${PO_STATUSES.find(s => s.key === next)?.label ?? next}`);
    onChanged?.(next);
    fetchHistory();
  };

  return (
    <div className="space-y-3">
      {/* Stepper */}
      <ol className="flex items-center justify-between gap-1 px-1">
        {PO_TIMELINE_STEPS.map((step, idx) => {
          const isReached = reached.has(step.key);
          const isCurrent = po.status === step.key;
          return (
            <li key={step.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center text-center min-w-0 flex-1">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs",
                    isCurrent
                      ? "bg-primary border-primary text-primary-foreground"
                      : isReached
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-background border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isReached ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-2 h-2 fill-current" />}
                </div>
                <span className={cn("text-[10px] mt-1 truncate", isCurrent ? "font-semibold" : "text-muted-foreground")}>
                  {step.label}
                </span>
              </div>
              {idx < PO_TIMELINE_STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1 mx-1", reached.has(PO_TIMELINE_STEPS[idx + 1].key) ? "bg-emerald-500" : "bg-muted")} />
              )}
            </li>
          );
        })}
      </ol>

      {/* Action row */}
      <div className="space-y-2">
        <Textarea
          placeholder="Optional note (e.g. delivery slip #, vendor reply)…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[60px] text-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {PO_TIMELINE_STEPS.map(step => {
            const isCurrent = po.status === step.key;
            return (
              <Button
                key={step.key}
                size="sm"
                variant={isCurrent ? "default" : "outline"}
                disabled={isCurrent || pending !== null}
                onClick={() => setStatus(step.key)}
                className="h-8 text-xs"
              >
                {pending === step.key && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Mark {step.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div>
        <p className="text-[11px] uppercase text-muted-foreground mb-1.5">History</p>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No status changes yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {[...history].reverse().map(h => {
              const st = PO_STATUSES.find(s => s.key === h.to_status);
              return (
                <li key={h.id} className="text-xs border rounded p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[10px] ${st?.cls ?? ""}`}>{st?.label ?? h.to_status}</Badge>
                      {h.from_status && <span className="text-muted-foreground">from {h.from_status}</span>}
                    </div>
                    <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("en-IN")}</span>
                  </div>
                  {h.actor && <p className="text-muted-foreground mt-0.5">by {h.actor}</p>}
                  {h.note && <p className="mt-1">{h.note}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
