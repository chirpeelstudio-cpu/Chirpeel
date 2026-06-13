-- Floorplans: drop broad public SELECT, allow only authenticated listing.
DROP POLICY IF EXISTS "Anyone can read floorplans" ON storage.objects;

CREATE POLICY "Authenticated can list floorplans"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'floorplans');

-- Project files: drop public SELECT, allow only authenticated listing.
DROP POLICY IF EXISTS "Anyone can view project files" ON storage.objects;

CREATE POLICY "Authenticated can list project files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-files');

-- Quotations: drop public SELECT, allow only authenticated listing.
DROP POLICY IF EXISTS "Public can read quotation PDFs" ON storage.objects;

CREATE POLICY "Authenticated can list quotation PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'quotations');