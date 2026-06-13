export interface RecurringTemplate {
  id: string;
  quotation_id: string | null;
  lead_id: string | null;
  milestone: string | null;
  milestone_label: string | null;
  amount: number;
  gst_enabled: boolean;
  gst_rate: number;
  frequency: "weekly" | "monthly" | "quarterly";
  next_run_date: string;
  last_generated_at: string | null;
  active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const FREQUENCY_LABEL: Record<RecurringTemplate["frequency"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};
