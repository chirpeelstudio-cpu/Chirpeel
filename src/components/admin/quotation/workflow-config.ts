export type WorkflowStatus =
  | "draft"
  | "internal_review"
  | "sent"
  | "negotiation"
  | "approved"
  | "rejected";

export const WORKFLOW_LABEL: Record<WorkflowStatus, string> = {
  draft: "Draft",
  internal_review: "In Review",
  sent: "Sent",
  negotiation: "Negotiation",
  approved: "Approved",
  rejected: "Rejected",
};

export const WORKFLOW_BADGE_CLASS: Record<WorkflowStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  internal_review: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  sent: "bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-300",
  negotiation: "bg-purple-100 text-purple-900 dark:bg-purple-500/15 dark:text-purple-300",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-300",
};

export interface WorkflowAction {
  to: WorkflowStatus;
  label: string;
  variant?: "default" | "outline" | "destructive" | "secondary";
  managerOnly?: boolean;
  requiresNote?: boolean;
}

export const ALLOWED_TRANSITIONS: Record<WorkflowStatus, WorkflowAction[]> = {
  draft: [{ to: "internal_review", label: "Submit for Review" }],
  internal_review: [
    { to: "approved", label: "Approve", variant: "default", managerOnly: true },
    { to: "rejected", label: "Reject", variant: "destructive", managerOnly: true, requiresNote: true },
  ],
  approved: [{ to: "sent", label: "Mark as Sent", variant: "default" }],
  sent: [{ to: "negotiation", label: "Mark Negotiation", variant: "outline" }],
  negotiation: [
    { to: "approved", label: "Approve", variant: "default", managerOnly: true },
    { to: "rejected", label: "Reject", variant: "destructive", managerOnly: true, requiresNote: true },
  ],
  rejected: [{ to: "draft", label: "Reopen as Draft", variant: "outline", managerOnly: true }],
};

export interface QuotationVersion {
  id: string;
  quotation_id: string;
  version_number: number;
  label: string | null;
  trigger: "send" | "manual" | "restore" | string;
  snapshot: any;
  total_amount: number;
  created_at: string;
  created_by: string | null;
}

export interface WorkflowLogEntry {
  id: string;
  quotation_id: string;
  from_status: string | null;
  to_status: string;
  actor: string | null;
  note: string | null;
  created_at: string;
}
