-- Deduplicate any existing rows by lowercased email, keeping the earliest
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY created_at) AS rn
  FROM public.playbook_subscribers
)
DELETE FROM public.playbook_subscribers
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.playbook_subscribers
  ADD CONSTRAINT playbook_subscribers_email_unique UNIQUE (email);