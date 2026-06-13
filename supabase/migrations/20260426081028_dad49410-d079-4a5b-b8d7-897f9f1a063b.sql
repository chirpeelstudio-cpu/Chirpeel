
-- Replace permissive write policies with admin/manager-only policies
DROP POLICY IF EXISTS "Authenticated users can upload branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete branding" ON storage.objects;

CREATE POLICY "Admins and managers can upload branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can delete branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND public.is_admin_or_manager(auth.uid()));
