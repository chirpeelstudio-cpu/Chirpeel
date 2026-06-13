-- Add floorplan_url column to leads table
ALTER TABLE public.leads ADD COLUMN floorplan_url text;

-- Create floorplans storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('floorplans', 'floorplans', true);

-- Allow anyone to upload to floorplans bucket
CREATE POLICY "Anyone can upload floorplans" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'floorplans');

-- Allow anyone to read floorplans
CREATE POLICY "Anyone can read floorplans" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'floorplans');