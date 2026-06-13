ALTER TABLE public.lead_follow_ups 
ADD COLUMN outcome text DEFAULT NULL,
ADD COLUMN completed_at timestamp with time zone DEFAULT NULL;