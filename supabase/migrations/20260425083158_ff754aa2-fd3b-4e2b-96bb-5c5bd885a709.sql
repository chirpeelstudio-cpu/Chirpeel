CREATE OR REPLACE FUNCTION public.clone_quotation(_source_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_id uuid;
  v_creator text;
  v_old_room_id uuid;
  v_new_room_id uuid;
BEGIN
  v_creator := current_profile_identifier();

  INSERT INTO public.quotations (
    lead_id, customer_name, customer_phone, customer_email, customer_address,
    project_location, project_name, project_type, sales_person,
    quotation_date, validity_days, subtotal, discount_type, discount_value,
    discount_amount, gst_enabled, gst_rate, gst_amount, total_amount,
    template_format, terms_conditions, notes, status, pdf_url,
    hardware_brand, core_material_brand, laminate_brand, brand_selections,
    created_by
  )
  SELECT
    NULL, customer_name, customer_phone, customer_email, customer_address,
    project_location,
    COALESCE(project_name,'') || ' (Copy)',
    project_type, sales_person,
    CURRENT_DATE, validity_days, subtotal, discount_type, discount_value,
    discount_amount, gst_enabled, gst_rate, gst_amount, total_amount,
    template_format, terms_conditions, notes, 'draft', NULL,
    hardware_brand, core_material_brand, laminate_brand, brand_selections,
    v_creator
  FROM public.quotations
  WHERE id = _source_id
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    RAISE EXCEPTION 'Source quotation not found: %', _source_id;
  END IF;

  -- Clone rooms one-by-one so we can also clone their child line items
  FOR v_old_room_id IN
    SELECT id FROM public.quotation_rooms WHERE quotation_id = _source_id ORDER BY sort_order, created_at
  LOOP
    INSERT INTO public.quotation_rooms (
      quotation_id, room_name, room_type, material_type_key,
      width_ft, height_ft, depth_ft, area_sqft, quantity,
      material_id, material_name, material_rate,
      hardware_id, hardware_name, hardware_rate, hardware_fixed,
      core_material_id, core_material_name, core_material_rate,
      shutter_finish, custom_cost, notes, total_cost, sort_order
    )
    SELECT
      v_new_id, room_name, room_type, material_type_key,
      width_ft, height_ft, depth_ft, area_sqft, quantity,
      material_id, material_name, material_rate,
      hardware_id, hardware_name, hardware_rate, hardware_fixed,
      core_material_id, core_material_name, core_material_rate,
      shutter_finish, custom_cost, notes, total_cost, sort_order
    FROM public.quotation_rooms
    WHERE id = v_old_room_id
    RETURNING id INTO v_new_room_id;

    INSERT INTO public.quotation_room_items (
      quotation_room_id, catalog_id, item_name, item_category, item_type,
      width_ft, height_ft, area_sqft, quantity, rate, cost_rate,
      pricing_mode, total_cost, notes, sort_order
    )
    SELECT
      v_new_room_id, catalog_id, item_name, item_category, item_type,
      width_ft, height_ft, area_sqft, quantity, rate, cost_rate,
      pricing_mode, total_cost, notes, sort_order
    FROM public.quotation_room_items
    WHERE quotation_room_id = v_old_room_id;
  END LOOP;

  RETURN v_new_id;
END;
$$;