-- Extend playbook_subscribers with mobile + verification status
ALTER TABLE public.playbook_subscribers
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Allow public UPDATE only on verified flag flip via edge function (service role bypasses RLS).
-- We don't add a public UPDATE policy; edge functions use service role.

-- New: OTP verification table
CREATE TABLE IF NOT EXISTS public.playbook_otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL,
  mobile text,
  otp_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  verified_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playbook_otp_email_idx
  ON public.playbook_otp_verifications (lower(email), created_at DESC);
CREATE INDEX IF NOT EXISTS playbook_otp_ip_idx
  ON public.playbook_otp_verifications (ip, created_at DESC);

ALTER TABLE public.playbook_otp_verifications ENABLE ROW LEVEL SECURITY;

-- No public read — only admins can see verification rows
CREATE POLICY "Admins can view OTP verifications"
  ON public.playbook_otp_verifications
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete OTP verifications"
  ON public.playbook_otp_verifications
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Cleanup helper for expired/old OTP rows (callable from cron later)
CREATE OR REPLACE FUNCTION public.cleanup_playbook_otps()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_deleted int;
BEGIN
  DELETE FROM public.playbook_otp_verifications
    WHERE created_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;