
DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'leads','quotations','quotation_rooms','quotation_room_items','quotation_versions',
    'quotation_workflow_log','quotation_send_history','invoices','payments','expenses',
    'projects','project_milestones','project_materials','project_boq_items','project_files',
    'project_stage_photos','lead_follow_ups','lead_messages','client_share_links',
    'company_settings','app_settings','team_members','message_templates','pipeline_stages',
    'lead_sources','lead_tags','lead_routing_rules','brand_catalog','pricing_catalog',
    'pricing_rooms','pricing_item_categories','material_pricing','material_room_pricing',
    'expense_categories','gst_presets','payment_milestone_templates',
    'payment_milestone_template_items','boq_products','boq_product_vendors','vendors',
    'purchase_orders','po_status_history','activity_log','finance_reminder_log',
    'digest_log','tasks','recurring_invoice_templates','room_category_map',
    'vendor_po_dispatch_log','invoice_fy_seq'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()', t);
  END LOOP;
END $$;
