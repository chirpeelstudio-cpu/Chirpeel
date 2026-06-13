
CREATE OR REPLACE FUNCTION public.complete_onboarding(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing_id uuid;
  v_admin_exists boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Bootstrap: if there is no admin/manager at all yet, make this user admin.
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('admin','manager'))
    INTO v_admin_exists;
  IF NOT v_admin_exists THEN
    INSERT INTO public.user_roles (user_id, role)
      VALUES (v_uid, 'admin')
      ON CONFLICT DO NOTHING;
  END IF;

  -- Also guarantee the calling user has SOME role so they can use the app.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    INSERT INTO public.user_roles (user_id, role)
      VALUES (v_uid, 'admin')
      ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_existing_id FROM public.company_settings LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.company_settings (
      company_name, logo_url, phone, email, address, gstin,
      primary_color, accent_color, currency, currency_symbol,
      timezone, fy_start_month, onboarding_completed_at
    ) VALUES (
      COALESCE(payload->>'company_name',''),
      NULLIF(payload->>'logo_url',''),
      NULLIF(payload->>'phone',''),
      NULLIF(payload->>'email',''),
      NULLIF(payload->>'address',''),
      NULLIF(payload->>'gstin',''),
      NULLIF(payload->>'primary_color',''),
      COALESCE(NULLIF(payload->>'accent_color',''), '#0F2C5F'),
      COALESCE(NULLIF(payload->>'currency',''), 'INR'),
      COALESCE(NULLIF(payload->>'currency_symbol',''), '₹'),
      COALESCE(NULLIF(payload->>'timezone',''), 'Asia/Kolkata'),
      COALESCE((payload->>'fy_start_month')::int, 4),
      now()
    ) RETURNING id INTO v_existing_id;
  ELSE
    UPDATE public.company_settings SET
      company_name = COALESCE(NULLIF(payload->>'company_name',''), company_name),
      logo_url = COALESCE(NULLIF(payload->>'logo_url',''), logo_url),
      phone = COALESCE(NULLIF(payload->>'phone',''), phone),
      email = COALESCE(NULLIF(payload->>'email',''), email),
      address = COALESCE(NULLIF(payload->>'address',''), address),
      gstin = COALESCE(NULLIF(payload->>'gstin',''), gstin),
      primary_color = COALESCE(NULLIF(payload->>'primary_color',''), primary_color),
      accent_color = COALESCE(NULLIF(payload->>'accent_color',''), accent_color),
      currency = COALESCE(NULLIF(payload->>'currency',''), currency),
      currency_symbol = COALESCE(NULLIF(payload->>'currency_symbol',''), currency_symbol),
      timezone = COALESCE(NULLIF(payload->>'timezone',''), timezone),
      fy_start_month = COALESCE((payload->>'fy_start_month')::int, fy_start_month),
      onboarding_completed_at = now(),
      updated_at = now()
    WHERE id = v_existing_id;
  END IF;

  RETURN jsonb_build_object('id', v_existing_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(jsonb) TO authenticated;
