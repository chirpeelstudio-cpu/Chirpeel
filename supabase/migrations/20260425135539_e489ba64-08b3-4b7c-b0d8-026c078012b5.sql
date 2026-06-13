ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS google_calendar_id text,
  ADD COLUMN IF NOT EXISTS calendar_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS calendar_html_link text;

CREATE INDEX IF NOT EXISTS idx_tasks_google_event ON public.tasks (google_event_id) WHERE google_event_id IS NOT NULL;