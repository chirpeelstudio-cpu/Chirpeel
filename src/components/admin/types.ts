export interface PipelineLead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  pincode: string | null;
  source: string | null;
  resume_url: string | null;
  floorplan_url: string | null;
  project_type: string | null;
  budget: string | null;
  timeline: string | null;
  details: string | null;
  created_at: string;
  stage: string;
  status: string;
  assigned_to: string | null;
  next_followup_date: string | null;
  payment_10_percent: boolean;
  payment_50_percent: boolean;
  payment_100_percent: boolean;
  payment_10_amount: number | null;
  payment_50_amount: number | null;
  payment_100_amount: number | null;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  note: string | null;
  follow_up_date: string;
  completed: boolean;
  outcome: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProjectFile {
  id: string;
  lead_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  created_at: string;
}

export interface LeadMessage {
  id: string;
  lead_id: string;
  template_key: string | null;
  template_title: string | null;
  body: string;
  channel: string;
  sent_by: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
}
