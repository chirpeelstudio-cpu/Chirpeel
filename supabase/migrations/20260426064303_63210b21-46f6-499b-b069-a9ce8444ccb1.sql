-- Restore anonymous uploads for floorplans (used by public quote forms)
DROP POLICY IF EXISTS "Authenticated can upload floorplans" ON storage.objects;
CREATE POLICY "Anyone can upload floorplans"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'floorplans');

-- Restore anonymous uploads for resumes (used by public careers page)
DROP POLICY IF EXISTS "Authenticated can upload resumes" ON storage.objects;
CREATE POLICY "Anyone can upload resumes"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'resumes');