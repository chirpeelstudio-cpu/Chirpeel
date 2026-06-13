
-- Add pipeline columns to leads table
ALTER TABLE leads ADD COLUMN stage text DEFAULT 'leads';
ALTER TABLE leads ADD COLUMN status text DEFAULT 'new_lead';
ALTER TABLE leads ADD COLUMN assigned_to text;
ALTER TABLE leads ADD COLUMN next_followup_date timestamptz;
ALTER TABLE leads ADD COLUMN payment_10_percent boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN payment_50_percent boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN payment_100_percent boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN payment_10_amount numeric;
ALTER TABLE leads ADD COLUMN payment_50_amount numeric;
ALTER TABLE leads ADD COLUMN payment_100_amount numeric;

-- Allow authenticated users to update leads
CREATE POLICY "Authenticated users can update leads" ON leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Follow-ups table
CREATE TABLE lead_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  note text,
  follow_up_date timestamptz NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE lead_follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage follow_ups" ON lead_follow_ups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Project files table
CREATE TABLE project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text DEFAULT 'document',
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage project_files" ON project_files FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Team members table
CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  phone text,
  email text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage team_members" ON team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', true);
CREATE POLICY "Authenticated users can upload project files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-files');
CREATE POLICY "Anyone can view project files" ON storage.objects FOR SELECT TO public USING (bucket_id = 'project-files');
CREATE POLICY "Authenticated users can delete project files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-files');
