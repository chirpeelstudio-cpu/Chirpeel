-- Replace broad authenticated SELECT with admin/manager-scoped listing.
DROP POLICY IF EXISTS "Authenticated can list floorplans" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can list project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can list quotation PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read resumes" ON storage.objects;

CREATE POLICY "Admin/manager list floorplans"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'floorplans' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager list project files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-files' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager list quotation PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'quotations' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager list resumes"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND public.is_admin_or_manager(auth.uid()));