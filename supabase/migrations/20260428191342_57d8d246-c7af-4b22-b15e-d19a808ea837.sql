ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS hear_about_us text,
  ADD COLUMN IF NOT EXISTS hear_about_us_other text,
  ADD COLUMN IF NOT EXISTS primary_goal text;

CREATE OR REPLACE FUNCTION public.complete_onboarding(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_settings_id uuid;
  v_company_name text := COALESCE(NULLIF(payload->>'company_name',''), 'My Studio');
  v_specialties text[];
  v_service_areas text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF payload ? 'specialties' AND jsonb_typeof(payload->'specialties') = 'array' THEN
    SELECT array_agg(value::text) INTO v_specialties
    FROM jsonb_array_elements_text(payload->'specialties');
  END IF;
  IF payload ? 'service_areas' AND jsonb_typeof(payload->'service_areas') = 'array' THEN
    SELECT array_agg(value::text) INTO v_service_areas
    FROM jsonb_array_elements_text(payload->'service_areas');
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.tenant_members WHERE user_id = v_uid LIMIT 1;
  IF v_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, created_by) VALUES (v_company_name, v_uid)
      RETURNING id INTO v_tenant_id;
    INSERT INTO public.tenant_members (tenant_id, user_id) VALUES (v_tenant_id, v_uid)
      ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.tenants SET name = v_company_name WHERE id = v_tenant_id AND created_by = v_uid;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin')
    ON CONFLICT DO NOTHING;

  SELECT id INTO v_settings_id FROM public.company_settings WHERE tenant_id = v_tenant_id LIMIT 1;
  IF v_settings_id IS NULL THEN
    INSERT INTO public.company_settings (
      tenant_id, company_name, logo_url, phone, email, address, gstin,
      primary_color, accent_color, currency, currency_symbol,
      timezone, fy_start_month,
      specialties, avg_ticket, typical_duration_days,
      service_areas, primary_city,
      hear_about_us, hear_about_us_other, primary_goal,
      onboarding_completed_at
    ) VALUES (
      v_tenant_id, v_company_name,
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
      v_specialties,
      NULLIF(payload->>'avg_ticket',''),
      COALESCE((payload->>'typical_duration_days')::int, 45),
      v_service_areas,
      COALESCE(NULLIF(payload->>'primary_city',''), 'Tirupur'),
      NULLIF(payload->>'hear_about_us',''),
      NULLIF(payload->>'hear_about_us_other',''),
      NULLIF(payload->>'primary_goal',''),
      now()
    ) RETURNING id INTO v_settings_id;
  ELSE
    UPDATE public.company_settings SET
      company_name = v_company_name,
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
      specialties = COALESCE(v_specialties, specialties),
      avg_ticket = COALESCE(NULLIF(payload->>'avg_ticket',''), avg_ticket),
      typical_duration_days = COALESCE((payload->>'typical_duration_days')::int, typical_duration_days),
      service_areas = COALESCE(v_service_areas, service_areas),
      primary_city = COALESCE(NULLIF(payload->>'primary_city',''), primary_city),
      hear_about_us = COALESCE(NULLIF(payload->>'hear_about_us',''), hear_about_us),
      hear_about_us_other = COALESCE(NULLIF(payload->>'hear_about_us_other',''), hear_about_us_other),
      primary_goal = COALESCE(NULLIF(payload->>'primary_goal',''), primary_goal),
      onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
      updated_at = now()
    WHERE id = v_settings_id;
  END IF;

  RETURN jsonb_build_object('id', v_settings_id, 'tenant_id', v_tenant_id);
END;
$function$;