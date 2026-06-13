export interface Project {
  id: string;
  name: string;
  lead_id: string | null;
  quotation_id: string | null;
  project_type: string | null;
  site_address: string | null;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  status: string;
  progress_pct: number;
  budget: number;
  project_manager: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  target_date: string | null;
  completed_at: string | null;
  sort_order: number;
  notes: string | null;
}

export interface ProjectMaterial {
  id: string;
  project_id: string;
  item_name: string;
  qty_required: number;
  qty_received: number;
  unit: string | null;
  vendor_id: string | null;
  notes: string | null;
}

export const PROJECT_STATUSES = [
  { key: "planning",    label: "Planning",     color: "bg-slate-200",   pillCls: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "design",      label: "Design",       color: "bg-violet-300",  pillCls: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "procurement", label: "Procurement",  color: "bg-amber-300",   pillCls: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "production",  label: "Production",   color: "bg-orange-300",  pillCls: "bg-orange-100 text-orange-700 border-orange-200" },
  { key: "site_work",   label: "Site Work",    color: "bg-blue-300",    pillCls: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "handover",    label: "Handover",     color: "bg-cyan-300",    pillCls: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { key: "completed",   label: "Completed",    color: "bg-emerald-400", pillCls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "on_hold",     label: "On Hold",      color: "bg-red-300",     pillCls: "bg-red-100 text-red-700 border-red-200" },
];
