import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Send as SendIcon,
  Clock,
  RefreshCw,
  FileText,
  MessageSquare,
  User,
  Filter,
} from "lucide-react";
import {
  WORKFLOW_BADGE_CLASS,
  WORKFLOW_LABEL,
  type WorkflowLogEntry,
  type WorkflowStatus,
} from "./workflow-config";

const ICON_FOR_STATUS: Record<string, JSX.Element> = {
  draft: <FileText className="w-4 h-4" />,
  internal_review: <Clock className="w-4 h-4" />,
  sent: <SendIcon className="w-4 h-4" />,
  negotiation: <RefreshCw className="w-4 h-4" />,
  approved: <CheckCircle2 className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
};

const RING_FOR_STATUS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  internal_review: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  negotiation: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const isDecision = (status: string) => status === "approved" || status === "rejected";

/** Short human-readable sentence describing what happened in a transition. */
const summarize = (e: WorkflowLogEntry): string => {
  const actor = e.actor || "Someone";
  const from = e.from_status as WorkflowStatus | null;
  const to = e.to_status as WorkflowStatus;
  switch (to) {
    case "internal_review":
      return `${actor} submitted the quotation for internal review.`;
    case "approved":
      if (from === "negotiation") return `${actor} approved the quotation after negotiation.`;
      return `${actor} approved the quotation.`;
    case "rejected":
      if (from === "negotiation") return `${actor} rejected the quotation during negotiation.`;
      return `${actor} rejected the quotation in review.`;
    case "sent":
      return `${actor} marked the quotation as sent to the customer.`;
    case "negotiation":
      return `${actor} moved the quotation into negotiation.`;
    case "draft":
      if (from === "rejected") return `${actor} reopened the rejected quotation as a new draft.`;
      return `${actor} reset the quotation to draft.`;
    default:
      return `${actor} changed status to ${WORKFLOW_LABEL[to] ?? to}.`;
  }
};

type FilterMode = "all" | "approvals" | "rejections" | WorkflowStatus;

const FILTER_OPTIONS: { key: FilterMode; label: string }[] = [
  { key: "all", label: "All" },
  { key: "approvals", label: "Approvals" },
  { key: "rejections", label: "Rejections" },
  { key: "internal_review", label: "Submitted" },
  { key: "sent", label: "Sent" },
  { key: "negotiation", label: "Negotiation" },
  { key: "draft", label: "Reopened" },
];

interface Props {
  quotationId: string;
  refreshKey?: number;
  variant?: "compact" | "full";
}

export const WorkflowTimeline = ({ quotationId, refreshKey = 0, variant = "full" }: Props) => {
  const [entries, setEntries] = useState<WorkflowLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("quotation_workflow_log" as never)
        .select("*")
        .eq("quotation_id", quotationId)
        .order("created_at", { ascending: false });
      setEntries((data ?? []) as unknown as WorkflowLogEntry[]);
      setLoading(false);
    })();
  }, [quotationId, refreshKey]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    if (filter === "approvals") return entries.filter((e) => e.to_status === "approved");
    if (filter === "rejections") return entries.filter((e) => e.to_status === "rejected");
    return entries.filter((e) => e.to_status === filter);
  }, [entries, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: entries.length,
      approvals: 0,
      rejections: 0,
      internal_review: 0,
      sent: 0,
      negotiation: 0,
      draft: 0,
    };
    entries.forEach((e) => {
      if (e.to_status === "approved") c.approvals++;
      else if (e.to_status === "rejected") c.rejections++;
      if (c[e.to_status] !== undefined) c[e.to_status]++;
    });
    return c;
  }, [entries]);

  if (loading) return <p className="text-xs text-muted-foreground">Loading timeline…</p>;

  if (!entries.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No workflow activity yet. Status changes will appear here with the actor, timestamp, and any decision notes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Filter className="w-3 h-3 text-muted-foreground mr-0.5" />
        {FILTER_OPTIONS.map((opt) => {
          const count = counts[opt.key] ?? 0;
          const active = filter === opt.key;
          if (opt.key !== "all" && count === 0) return null;
          return (
            <Button
              key={opt.key}
              size="sm"
              variant={active ? "default" : "outline"}
              className="h-6 px-2 text-[11px]"
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
              <span className={`ml-1 ${active ? "opacity-80" : "text-muted-foreground"}`}>
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">No entries match this filter.</p>
      ) : (
        <ol className={variant === "compact" ? "space-y-2" : "relative space-y-4"}>
          {variant === "full" && (
            <span aria-hidden className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
          )}
          {filtered.map((e) => {
            const to = e.to_status as WorkflowStatus;
            const decision = isDecision(e.to_status);
            return (
              <li
                key={e.id}
                className={variant === "full" ? "relative pl-10" : "border-l-2 border-border pl-3 py-1"}
              >
                {variant === "full" && (
                  <span
                    className={`absolute left-0 top-0 inline-flex items-center justify-center w-8 h-8 rounded-full ${RING_FOR_STATUS[to] ?? "bg-muted"}`}
                  >
                    {ICON_FOR_STATUS[to] ?? <Clock className="w-4 h-4" />}
                  </span>
                )}

                {/* from → to transition labels */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {e.from_status && (
                    <>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {WORKFLOW_LABEL[e.from_status as WorkflowStatus] ?? e.from_status}
                      </Badge>
                      <span className="text-muted-foreground text-xs">→</span>
                    </>
                  )}
                  <Badge className={WORKFLOW_BADGE_CLASS[to] ?? ""}>
                    {WORKFLOW_LABEL[to] ?? e.to_status}
                  </Badge>
                  {decision && (
                    <span className="text-xs font-medium">
                      {e.to_status === "approved" ? "approved" : "rejected"} by
                    </span>
                  )}
                  {e.actor && (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">{e.actor}</span>
                    </span>
                  )}
                </div>

                {/* Human-readable summary sentence */}
                <p className="text-sm text-foreground/80 mt-1">{summarize(e)}</p>

                <div className="text-xs text-muted-foreground mt-0.5">{formatTime(e.created_at)}</div>

                {e.note && (
                  <div className="mt-1.5 flex items-start gap-1.5 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
                    <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="italic">{e.note}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
