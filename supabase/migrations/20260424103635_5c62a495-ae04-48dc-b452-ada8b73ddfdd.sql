-- Phase 1: Margin visibility + transactional save RPC

-- 1. Add cost_rate columns for margin tracking
ALTER TABLE public.quotation_room_items
  ADD COLUMN IF NOT EXISTS cost_rate numeric NOT NULL DEFAULT 0;

ALTER TABLE public.pricing_catalog
  ADD COLUMN IF NOT EXISTS cost_rate_per_sqft numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_fixed numeric NOT NULL DEFAULT 0;

ALTER TABLE public.material_pricing
  ADD COLUMN IF NOT EXISTS cost_rate_per_sqft numeric NOT NULL DEFAULT 0;

ALTER TABLE public.material_room_pricing
  ADD COLUMN IF NOT EXISTS cost_rate_per_sqft numeric NOT NULL DEFAULT 0;

-- 2. Transactional save RPC: replaces orphan-prone multi-call save
CREATE OR REPLACE FUNCTION public.save_quotation(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quotation_id uuid;
  v_is_new boolean;
  v_header jsonb := payload->'header';
  v_rooms jsonb := COALESCE(payload->'rooms', '[]'::jsonb);
  v_room jsonb;
  v_room_id uuid;
  v_item jsonb;
  v_creator text;
BEGIN
  v_creator := current_profile_identifier();
  v_quotation_id := NULLIF(v_header->>'id','')::uuid;
  v_is_new := v_quotation_id IS NULL;

  IF v_is_new THEN
    INSERT INTO public.quotations (
      lead_id, customer_name, customer_phone, customer_email, customer_address,
      project_location, project_name, project_type, sales_person,
      quotation_date, validity_days, subtotal, discount_type, discount_value,
      discount_amount, gst_enabled, gst_rate, gst_amount, total_amount,
      template_format, terms_conditions, notes, status, pdf_url,
      hardware_brand, core_material_brand, laminate_brand, brand_selections,
      created_by
    ) VALUES (
      NULLIF(v_header->>'lead_id','')::uuid,
      v_header->>'customer_name',
      v_header->>'customer_phone',
      v_header->>'customer_email',
      v_header->>'customer_address',
      v_header->>'project_location',
      v_header->>'project_name',
      v_header->>'project_type',
      v_header->>'sales_person',
      COALESCE((v_header->>'quotation_date')::date, CURRENT_DATE),
      COALESCE((v_header->>'validity_days')::int, 15),
      COALESCE((v_header->>'subtotal')::numeric, 0),
      COALESCE(v_header->>'discount_type','percent'),
      COALESCE((v_header->>'discount_value')::numeric, 0),
      COALESCE((v_header->>'discount_amount')::numeric, 0),
      COALESCE((v_header->>'gst_enabled')::boolean, true),
      COALESCE((v_header->>'gst_rate')::numeric, 18),
      COALESCE((v_header->>'gst_amount')::numeric, 0),
      COALESCE((v_header->>'total_amount')::numeric, 0),
      COALESCE(v_header->>'template_format','detailed'),
      v_header->>'terms_conditions',
      v_header->>'notes',
      COALESCE(v_header->>'status','draft'),
      v_header->>'pdf_url',
      v_header->>'hardware_brand',
      v_header->>'core_material_brand',
      v_header->>'laminate_brand',
      COALESCE(v_header->'brand_selections','{}'::jsonb),
      v_creator
    )
    RETURNING id INTO v_quotation_id;
  ELSE
    UPDATE public.quotations SET
      lead_id = NULLIF(v_header->>'lead_id','')::uuid,
      customer_name = v_header->>'customer_name',
      customer_phone = v_header->>'customer_phone',
      customer_email = v_header->>'customer_email',
      customer_address = v_header->>'customer_address',
      project_location = v_header->>'project_location',
      project_name = v_header->>'project_name',
      project_type = v_header->>'project_type',
      sales_person = v_header->>'sales_person',
      quotation_date = COALESCE((v_header->>'quotation_date')::date, CURRENT_DATE),
      validity_days = COALESCE((v_header->>'validity_days')::int, 15),
      subtotal = COALESCE((v_header->>'subtotal')::numeric, 0),
      discount_type = COALESCE(v_header->>'discount_type','percent'),
      discount_value = COALESCE((v_header->>'discount_value')::numeric, 0),
      discount_amount = COALESCE((v_header->>'discount_amount')::numeric, 0),
      gst_enabled = COALESCE((v_header->>'gst_enabled')::boolean, true),
      gst_rate = COALESCE((v_header->>'gst_rate')::numeric, 18),
      gst_amount = COALESCE((v_header->>'gst_amount')::numeric, 0),
      total_amount = COALESCE((v_header->>'total_amount')::numeric, 0),
      template_format = COALESCE(v_header->>'template_format','detailed'),
      terms_conditions = v_header->>'terms_conditions',
      notes = v_header->>'notes',
      status = COALESCE(v_header->>'status','draft'),
      pdf_url = v_header->>'pdf_url',
      hardware_brand = v_header->>'hardware_brand',
      core_material_brand = v_header->>'core_material_brand',
      laminate_brand = v_header->>'laminate_brand',
      brand_selections = COALESCE(v_header->'brand_selections','{}'::jsonb),
      updated_at = now()
    WHERE id = v_quotation_id;
  END IF;

  -- Replace rooms+items atomically
  DELETE FROM public.quotation_room_items
    WHERE quotation_room_id IN (SELECT id FROM public.quotation_rooms WHERE quotation_id = v_quotation_id);
  DELETE FROM public.quotation_rooms WHERE quotation_id = v_quotation_id;

  FOR v_room IN SELECT * FROM jsonb_array_elements(v_rooms) LOOP
    INSERT INTO public.quotation_rooms (
      quotation_id, room_name, room_type, material_type_key,
      width_ft, height_ft, depth_ft, area_sqft, quantity,
      material_id, material_name, material_rate,
      hardware_id, hardware_name, hardware_rate, hardware_fixed,
      core_material_id, core_material_name, core_material_rate,
      shutter_finish, custom_cost, notes, total_cost, sort_order
    ) VALUES (
      v_quotation_id,
      v_room->>'room_name',
      v_room->>'room_type',
      v_room->>'material_type_key',
      COALESCE((v_room->>'width_ft')::numeric, 0),
      COALESCE((v_room->>'height_ft')::numeric, 0),
      NULLIF(v_room->>'depth_ft','')::numeric,
      COALESCE((v_room->>'area_sqft')::numeric, 0),
      COALESCE((v_room->>'quantity')::numeric, 1),
      NULLIF(v_room->>'material_id','')::uuid,
      v_room->>'material_name',
      COALESCE((v_room->>'material_rate')::numeric, 0),
      NULLIF(v_room->>'hardware_id','')::uuid,
      v_room->>'hardware_name',
      COALESCE((v_room->>'hardware_rate')::numeric, 0),
      COALESCE((v_room->>'hardware_fixed')::numeric, 0),
      NULLIF(v_room->>'core_material_id','')::uuid,
      v_room->>'core_material_name',
      COALESCE((v_room->>'core_material_rate')::numeric, 0),
      v_room->>'shutter_finish',
      COALESCE((v_room->>'custom_cost')::numeric, 0),
      v_room->>'notes',
      COALESCE((v_room->>'total_cost')::numeric, 0),
      COALESCE((v_room->>'sort_order')::int, 0)
    )
    RETURNING id INTO v_room_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_room->'line_items','[]'::jsonb)) LOOP
      INSERT INTO public.quotation_room_items (
        quotation_room_id, catalog_id, item_name, item_category, item_type,
        width_ft, height_ft, area_sqft, quantity, rate, cost_rate,
        pricing_mode, total_cost, notes, sort_order
      ) VALUES (
        v_room_id,
        NULLIF(v_item->>'catalog_id','')::uuid,
        v_item->>'item_name',
        v_item->>'item_category',
        v_item->>'item_type',
        COALESCE((v_item->>'width_ft')::numeric, 0),
        COALESCE((v_item->>'height_ft')::numeric, 0),
        COALESCE((v_item->>'area_sqft')::numeric, 0),
        COALESCE((v_item->>'quantity')::numeric, 1),
        COALESCE((v_item->>'rate')::numeric, 0),
        COALESCE((v_item->>'cost_rate')::numeric, 0),
        COALESCE(v_item->>'pricing_mode','sqft'),
        COALESCE((v_item->>'total_cost')::numeric, 0),
        v_item->>'notes',
        COALESCE((v_item->>'sort_order')::int, 0)
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('id', v_quotation_id, 'is_new', v_is_new);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_quotation(jsonb) TO authenticated;