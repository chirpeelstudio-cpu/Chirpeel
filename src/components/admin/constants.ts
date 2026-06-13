export const STAGES = [
  { key: 'leads', label: 'Leads', color: 'bg-blue-500' },
  { key: 'follow_up', label: 'Follow-up', color: 'bg-yellow-500' },
  { key: 'site_visit', label: 'Site Visit', color: 'bg-orange-500' },
  { key: 'booking', label: 'Booking', color: 'bg-pink-500' },
  { key: 'designing', label: 'Designing', color: 'bg-purple-500' },
  { key: 'execution', label: 'Execution', color: 'bg-indigo-500' },
  { key: 'handover', label: 'Handover', color: 'bg-teal-500' },
  { key: 'completed', label: 'Completed', color: 'bg-green-500' },
] as const;

export const STAGE_STATUSES: Record<string, string[]> = {
  leads: ['New Lead', 'Called', 'Not Picked', 'Interested', 'Not Interested', 'Follow-up Later'],
  follow_up: ['Pending', 'In Progress', 'Done'],
  site_visit: ['Scheduled', 'Visited', 'Measurement Taken'],
  booking: ['Quotation Shared', 'Negotiation', 'Booked (10% Advance)'],
  designing: ['In Designing', 'Design Shared', 'Design Approved'],
  execution: ['Site Cross Verified', 'Production Started', '50% Advance Received', 'Installation Started', 'Installation Done'],
  handover: ['Deep Cleaning', 'Handover Done', '100% Payment Received'],
  completed: ['Review Link Sent', 'Review Received'],
};

export const SOURCE_COLORS: Record<string, string> = {
  popup: 'bg-amber-100 text-amber-800 border-amber-200',
  quote_modal: 'bg-blue-100 text-blue-800 border-blue-200',
  contact_form: 'bg-green-100 text-green-800 border-green-200',
  price_calculator: 'bg-purple-100 text-purple-800 border-purple-200',
  google_meta_ads: 'bg-red-100 text-red-800 border-red-200',
  career: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  walk_in: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  google_ads: 'bg-red-100 text-red-800 border-red-200',
  meta_ads: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  referral: 'bg-pink-100 text-pink-800 border-pink-200',
  bni_referral: 'bg-orange-100 text-orange-800 border-orange-200',
};
