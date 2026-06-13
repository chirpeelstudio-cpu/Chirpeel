
-- ============ 1. Workflow columns on quotations ============
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS negotiation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_note text;

ALTER TABLE public.quotations
  DROP CONSTRAINT IF EXISTS quotations_workflow_status_check;
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_workflow_status_check
  CHECK (workflow_status IN ('draft','internal_review','sent','negotiation','approved','rejected'));

-- ============ 2. quotation_versions ============
CREATE TABLE IF NOT EXISTS public.quotation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL,
  version_number int NOT NULL,
  label text,
  trigger text NOT NULL DEFAULT 'manual',
  snapshot jsonb NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  UNIQUE (quotation_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_qid ON public.quotation_versions(quotation_id);

ALTER TABLE public.quotation_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View versions (scoped)" ON public.quotation_versions;
CREATE POLICY "View versions (scoped)" ON public.quotation_versions
  FOR SELECT TO authenticated
  USING (
    is_admin_or_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.quotations q
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE q.id = quotation_versions.quotation_id
        AND (q.created_by = current_profile_identifier()
             OR l.assigned_to = current_profile_identifier())
    )
  );

DROP POLICY IF EXISTS "Insert versions (scoped)" ON public.quotation_versions;
CREATE POLICY "Insert versions (scoped)" ON public.quotation_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.quotations q
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE q.id = quotation_versions.quotation_id
        AND (q.created_by = current_profile_identifier()
             OR l.assigned_to = current_profile_identifier())
    )
  );

DROP POLICY IF EXISTS "Delete versions (admin/manager)" ON public.quotation_versions;
CREATE POLICY "Delete versions (admin/manager)" ON public.quotation_versions
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid()));

-- ============ 3. quotation_workflow_log ============
CREATE TABLE IF NOT EXISTS public.quotation_workflow_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  actor text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_workflow_log_qid ON public.quotation_workflow_log(quotation_id);

ALTER TABLE public.quotation_workflow_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View workflow log (scoped)" ON public.quotation_workflow_log;
CREATE POLICY "View workflow log (scoped)" ON public.quotation_workflow_log
  FOR SELECT TO authenticated
  USING (
    is_admin_or_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.quotations q
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE q.id = quotation_workflow_log.quotation_id
        AND (q.created_by = current_profile_identifier()
             OR l.assigned_to = current_profile_identifier())
    )
  );

-- ============ 4. snapshot_quotation RPC ============
CREATE OR REPLACE FUNCTION public.snapshot_quotation(
  _quotation_id uuid,
  _label text DEFAULT NULL,
  _trigger text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version int;
  v_snapshot jsonb;
  v_total numeric;
  v_creator text;
  v_id uuid;
BEGIN
  v_creator := current_profile_identifier();

  SELECT COALESCE(MAX(version_number),0)+1 INTO v_version
    FROM public.quotation_versions WHERE quotation_id = _quotation_id;

  SELECT total_amount INTO v_total FROM public.quotations WHERE id = _quotation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation % not found', _quotation_id; END IF;

  SELECT jsonb_build_object(
    'header', to_jsonb(q.*),
    'rooms', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(r.*) || jsonb_build_object(
          'line_items', COALESCE((
            SELECT jsonb_agg(to_jsonb(i.*) ORDER BY i.sort_order, i.created_at)
            FROM public.quotation_room_items i WHERE i.quotation_room_id = r.id
          ), '[]'::jsonb)
        )
        ORDER BY r.sort_order, r.created_at
      )
      FROM public.quotation_rooms r WHERE r.quotation_id = q.id
    ), '[]'::jsonb)
  ) INTO v_snapshot
  FROM public.quotations q WHERE q.id = _quotation_id;

  INSERT INTO public.quotation_versions (
    quotation_id, version_number, label, trigger, snapshot, total_amount, created_by
  ) VALUES (
    _quotation_id, v_version, _label, COALESCE(_trigger,'manual'), v_snapshot, COALESCE(v_total,0), v_creator
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'version_number', v_version);
END; $$;

-- ============ 5. transition_quotation_workflow RPC ============
CREATE OR REPLACE FUNCTION public.transition_quotation_workflow(
  _quotation_id uuid,
  _to text,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current text;
  v_creator text;
  v_actor text;
  v_is_mgr boolean;
  v_is_creator boolean;
  v_legacy text;
  v_lead_assignee text;
  v_lead_id uuid;
BEGIN
  v_actor := current_profile_identifier();
  v_is_mgr := is_admin_or_manager(auth.uid());

  SELECT workflow_status, created_by, lead_id INTO v_current, v_creator, v_lead_id
    FROM public.quotations WHERE id = _quotation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found'; END IF;

  IF v_lead_id IS NOT NULL THEN
    SELECT assigned_to INTO v_lead_assignee FROM public.leads WHERE id = v_lead_id;
  END IF;

  v_is_creator := (v_creator = v_actor) OR (v_lead_assignee IS NOT NULL AND v_lead_assignee = v_actor);

  -- Validate transitions and permissions
  IF v_current = 'draft' AND _to = 'internal_review' THEN
    IF NOT (v_is_creator OR v_is_mgr) THEN RAISE EXCEPTION 'Not permitted'; END IF;
    UPDATE public.quotations SET workflow_status = _to, submitted_for_review_at = now(), updated_at = now()
      WHERE id = _quotation_id;
  ELSIF v_current = 'internal_review' AND _to IN ('approved','rejected') THEN
    IF NOT v_is_mgr THEN RAISE EXCEPTION 'Only admin/manager can approve or reject'; END IF;
    v_legacy := _to;
    UPDATE public.quotations SET workflow_status = _to, status = v_legacy,
      reviewed_at = now(), reviewed_by = v_actor, decided_at = now(), decision_note = _note, updated_at = now()
      WHERE id = _quotation_id;
  ELSIF v_current = 'approved' AND _to = 'sent' THEN
    IF NOT (v_is_creator OR v_is_mgr) THEN RAISE EXCEPTION 'Not permitted'; END IF;
    UPDATE public.quotations SET workflow_status = _to, status = 'sent', sent_at = now(), updated_at = now()
      WHERE id = _quotation_id;
  ELSIF v_current = 'sent' AND _to = 'negotiation' THEN
    IF NOT (v_is_creator OR v_is_mgr) THEN RAISE EXCEPTION 'Not permitted'; END IF;
    UPDATE public.quotations SET workflow_status = _to, negotiation_started_at = now(), updated_at = now()
      WHERE id = _quotation_id;
  ELSIF v_current = 'negotiation' AND _to IN ('approved','rejected') THEN
    IF NOT v_is_mgr THEN RAISE EXCEPTION 'Only admin/manager can approve or reject'; END IF;
    v_legacy := _to;
    UPDATE public.quotations SET workflow_status = _to, status = v_legacy,
      reviewed_at = now(), reviewed_by = v_actor, decided_at = now(), decision_note = _note, updated_at = now()
      WHERE id = _quotation_id;
  ELSIF v_current = 'rejected' AND _to = 'draft' THEN
    IF NOT v_is_mgr THEN RAISE EXCEPTION 'Only admin/manager can reopen'; END IF;
    UPDATE public.quotations SET workflow_status = _to, status = 'draft', updated_at = now()
      WHERE id = _quotation_id;
  ELSE
    RAISE EXCEPTION 'Illegal transition % -> %', v_current, _to;
  END IF;

  INSERT INTO public.quotation_workflow_log (quotation_id, from_status, to_status, actor, note)
    VALUES (_quotation_id, v_current, _to, v_actor, _note);

  RETURN jsonb_build_object('from', v_current, 'to', _to);
END; $$;
