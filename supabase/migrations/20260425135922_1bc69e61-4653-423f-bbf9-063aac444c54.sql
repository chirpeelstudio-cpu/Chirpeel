-- =========================================================
-- message_templates
-- =========================================================
DROP POLICY IF EXISTS "Authenticated can manage message_templates" ON public.message_templates;

CREATE POLICY "View message_templates (auth)"
  ON public.message_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/manager manage message_templates"
  ON public.message_templates FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- =========================================================
-- pricing_catalog
-- =========================================================
DROP POLICY IF EXISTS "Authenticated can manage pricing" ON public.pricing_catalog;
-- "Anyone authenticated can read pricing" SELECT policy stays in place.

CREATE POLICY "Admin/manager manage pricing_catalog"
  ON public.pricing_catalog FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- =========================================================
-- project_files (scoped to the parent lead's access rules)
-- =========================================================
DROP POLICY IF EXISTS "Authenticated can manage project_files" ON public.project_files;

CREATE POLICY "View project_files (scoped)"
  ON public.project_files FOR SELECT TO authenticated
  USING (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = project_files.lead_id
        AND l.assigned_to = current_profile_identifier()
    )
  );

CREATE POLICY "Insert project_files (scoped)"
  ON public.project_files FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = project_files.lead_id
        AND l.assigned_to = current_profile_identifier()
    )
  );

CREATE POLICY "Update project_files (scoped)"
  ON public.project_files FOR UPDATE TO authenticated
  USING (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = project_files.lead_id
        AND l.assigned_to = current_profile_identifier()
    )
  )
  WITH CHECK (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = project_files.lead_id
        AND l.assigned_to = current_profile_identifier()
    )
  );

CREATE POLICY "Delete project_files (scoped)"
  ON public.project_files FOR DELETE TO authenticated
  USING (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = project_files.lead_id
        AND l.assigned_to = current_profile_identifier()
    )
  );

-- =========================================================
-- quotation_rooms (scope to parent quotation editability)
-- =========================================================
DROP POLICY IF EXISTS "Authenticated can manage quotation_rooms" ON public.quotation_rooms;

CREATE POLICY "View quotation_rooms (scoped)"
  ON public.quotation_rooms FOR SELECT TO authenticated
  USING (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quotations q
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE q.id = quotation_rooms.quotation_id
        AND (
          q.created_by = current_profile_identifier()
          OR l.assigned_to = current_profile_identifier()
        )
    )
  );

CREATE POLICY "Write quotation_rooms (scoped)"
  ON public.quotation_rooms FOR ALL TO authenticated
  USING (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quotations q
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE q.id = quotation_rooms.quotation_id
        AND (
          q.created_by = current_profile_identifier()
          OR l.assigned_to = current_profile_identifier()
        )
    )
  )
  WITH CHECK (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quotations q
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE q.id = quotation_rooms.quotation_id
        AND (
          q.created_by = current_profile_identifier()
          OR l.assigned_to = current_profile_identifier()
        )
    )
  );

-- =========================================================
-- quotation_room_items (scope through parent room -> quotation)
-- =========================================================
DROP POLICY IF EXISTS "Authenticated can manage room items" ON public.quotation_room_items;

CREATE POLICY "View quotation_room_items (scoped)"
  ON public.quotation_room_items FOR SELECT TO authenticated
  USING (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.quotation_rooms r
      JOIN public.quotations q ON q.id = r.quotation_id
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE r.id = quotation_room_items.quotation_room_id
        AND (
          q.created_by = current_profile_identifier()
          OR l.assigned_to = current_profile_identifier()
        )
    )
  );

CREATE POLICY "Write quotation_room_items (scoped)"
  ON public.quotation_room_items FOR ALL TO authenticated
  USING (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.quotation_rooms r
      JOIN public.quotations q ON q.id = r.quotation_id
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE r.id = quotation_room_items.quotation_room_id
        AND (
          q.created_by = current_profile_identifier()
          OR l.assigned_to = current_profile_identifier()
        )
    )
  )
  WITH CHECK (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.quotation_rooms r
      JOIN public.quotations q ON q.id = r.quotation_id
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE r.id = quotation_room_items.quotation_room_id
        AND (
          q.created_by = current_profile_identifier()
          OR l.assigned_to = current_profile_identifier()
        )
    )
  );

-- =========================================================
-- quotation_send_history (scope inserts the same way as views)
-- =========================================================
DROP POLICY IF EXISTS "Insert send history (auth)" ON public.quotation_send_history;

CREATE POLICY "Insert send history (scoped)"
  ON public.quotation_send_history FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quotations q
      LEFT JOIN public.leads l ON l.id = q.lead_id
      WHERE q.id = quotation_send_history.quotation_id
        AND (
          q.created_by = current_profile_identifier()
          OR l.assigned_to = current_profile_identifier()
        )
    )
  );