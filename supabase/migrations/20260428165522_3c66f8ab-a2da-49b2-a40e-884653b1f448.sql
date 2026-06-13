-- Track signup attempts per IP for rate limiting
CREATE TABLE public.signup_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  email text,
  success boolean NOT NULL DEFAULT false,
  user_agent text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_rate_limits_ip_time
  ON public.signup_rate_limits (ip_address, attempted_at DESC);

CREATE INDEX idx_signup_rate_limits_attempted_at
  ON public.signup_rate_limits (attempted_at);

-- RLS: lock the table down. Only the service role (edge functions) can touch it.
ALTER TABLE public.signup_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated → all client-side reads/writes denied by default.

-- Cleanup function — deletes records older than 7 days. Can be called manually
-- or scheduled later via pg_cron.
CREATE OR REPLACE FUNCTION public.cleanup_signup_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.signup_rate_limits
    WHERE attempted_at < now() - interval '7 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;