ALTER TABLE public.leads ADD COLUMN resume_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true);

CREATE POLICY "Anyone can upload resumes" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Authenticated can read resumes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resumes');