CREATE OR REPLACE FUNCTION public.get_client_portal_data(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id uuid;
  v_link_id uuid;
  v_data jsonb;
BEGIN
  SELECT id, lead_id INTO v_link_id, v_lead_id
    FROM public.client_share_links
    WHERE token = _token
      AND revoked = false
      AND (expires_at IS NULL OR expires_at > now());
  IF v_lead_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.client_share_links
    SET view_count = view_count + 1, last_viewed_at = now()
    WHERE id = v_link_id;

  SELECT jsonb_build_object(
    'lead', (
      SELECT jsonb_build_object(
        'name', l.name,
        'project_type', l.project_type,
        'city', l.city,
        'stage', l.stage,
        'created_at', l.created_at
      ) FROM public.leads l WHERE l.id = v_lead_id AND l.deleted_at IS NULL
    ),
    'quotation', (
      SELECT jsonb_build_object(
        'quotation_number', q.quotation_number,
        'project_name', q.project_name,
        'subtotal', q.subtotal,
        'discount_amount', q.discount_amount,
        'gst_amount', q.gst_amount,
        'total_amount', q.total_amount,
        'sent_at', q.sent_at,
        'pdf_url', q.pdf_url,
        'status', q.status,
        'workflow_status', q.workflow_status,
        'client_approved_at', q.client_approved_at,
        'payment_link_url', q.payment_link_url,
        'auto_project_id', q.auto_project_id
      ) FROM public.quotations q
        WHERE q.lead_id = v_lead_id AND q.deleted_at IS NULL
        ORDER BY q.created_at DESC LIMIT 1
    ),
    'project', (
      SELECT jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'status', p.status,
        'progress_pct', p.progress_pct,
        'start_date', p.start_date,
        'target_end_date', p.target_end_date,
        'milestones', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'title', m.title,
            'target_date', m.target_date,
            'completed_at', m.completed_at,
            'sort_order', m.sort_order
          ) ORDER BY m.sort_order)
          FROM public.project_milestones m WHERE m.project_id = p.id
        ), '[]'::jsonb)
      )
      FROM public.projects p
      WHERE p.lead_id = v_lead_id AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC LIMIT 1
    ),
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'paid_on', p.paid_on, 'amount', p.amount, 'milestone', p.milestone, 'mode', p.mode
      ) ORDER BY p.paid_on DESC)
      FROM public.payments p
      WHERE p.lead_id = v_lead_id AND p.deleted_at IS NULL
    ), '[]'::jsonb),
    'invoices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'invoice_number', i.invoice_number, 'issue_date', i.issue_date,
        'due_date', i.due_date, 'total_amount', i.total_amount,
        'paid_amount', i.paid_amount, 'status', i.status, 'pdf_url', i.pdf_url
      ) ORDER BY i.issue_date DESC)
      FROM public.invoices i
      WHERE i.lead_id = v_lead_id AND i.deleted_at IS NULL
    ), '[]'::jsonb),
    'photos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'stage', sp.stage, 'photo_url', sp.photo_url,
        'caption', sp.caption, 'created_at', sp.created_at
      ) ORDER BY sp.created_at DESC)
      FROM public.project_stage_photos sp
      WHERE sp.lead_id = v_lead_id
    ), '[]'::jsonb),
    'files', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'file_name', f.file_name, 'file_url', f.file_url,
        'file_type', f.file_type, 'created_at', f.created_at
      ) ORDER BY f.created_at DESC)
      FROM public.project_files f
      WHERE f.lead_id = v_lead_id
    ), '[]'::jsonb),
    'company', (
      SELECT jsonb_build_object(
        'name', c.company_name, 'tagline', c.tagline,
        'phone', c.phone, 'email', c.email, 'website', c.website,
        'logo_url', c.logo_url, 'accent_color', c.accent_color
      ) FROM public.company_settings c LIMIT 1
    )
  ) INTO v_data;

  RETURN v_data;
END; $function$;