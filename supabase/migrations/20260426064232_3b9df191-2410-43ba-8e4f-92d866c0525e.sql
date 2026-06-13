-- 1. company_settings: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view company settings" ON public.company_settings;
CREATE POLICY "Authenticated can view company settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (true);

-- 2. team_members: restrict SELECT to admin/manager
DROP POLICY IF EXISTS "View team_members (auth)" ON public.team_members;
CREATE POLICY "Admin/manager view team_members"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- 3. quotations table: tighten INSERT
DROP POLICY IF EXISTS "Insert quotations (any auth)" ON public.quotations;
CREATE POLICY "Insert quotations (permitted)"
  ON public.quotations FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.is_admin_or_manager(auth.uid())
      OR public.has_permission(auth.uid(), 'quotation')
    )
    AND created_by = public.current_profile_identifier()
  );

-- 4. Storage: resumes & floorplans — require authenticated for INSERT
DROP POLICY IF EXISTS "Anyone can upload resumes" ON storage.objects;
CREATE POLICY "Authenticated can upload resumes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Anyone can upload floorplans" ON storage.objects;
CREATE POLICY "Authenticated can upload floorplans"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'floorplans');

-- 5. Storage: quotations bucket — admin/manager only for writes
DROP POLICY IF EXISTS "Authenticated can upload quotation PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update quotation PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete quotation PDFs" ON storage.objects;

CREATE POLICY "Admin/manager upload quotation PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quotations' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager update quotation PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'quotations' AND public.is_admin_or_manager(auth.uid()))
  WITH CHECK (bucket_id = 'quotations' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager delete quotation PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'quotations' AND public.is_admin_or_manager(auth.uid()));

-- 6. Storage: project-files bucket — admin/manager only for writes
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete project files" ON storage.objects;

CREATE POLICY "Admin/manager upload project files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-files' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager delete project files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-files' AND public.is_admin_or_manager(auth.uid()));

-- 7. Storage: company-assets bucket — admin/manager only for writes (public SELECT remains)
DROP POLICY IF EXISTS "Authenticated can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete company assets" ON storage.objects;

CREATE POLICY "Admin/manager upload company assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager update company assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets' AND public.is_admin_or_manager(auth.uid()))
  WITH CHECK (bucket_id = 'company-assets' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager delete company assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets' AND public.is_admin_or_manager(auth.uid()));