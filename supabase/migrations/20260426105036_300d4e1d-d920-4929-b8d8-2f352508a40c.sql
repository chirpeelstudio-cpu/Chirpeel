ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_tour_completed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.profiles SET tour_completed_at = now() WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_tour_completed() TO authenticated;