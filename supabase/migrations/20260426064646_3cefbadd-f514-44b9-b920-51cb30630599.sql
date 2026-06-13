-- Ensure RLS is enabled on realtime.messages (Supabase default, safe to re-assert)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Restrict SELECT (subscription receive) on the 'leads' topic to admin/manager
DROP POLICY IF EXISTS "Admin/manager subscribe to leads channel" ON realtime.messages;
CREATE POLICY "Admin/manager subscribe to leads channel"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    realtime.topic() <> 'leads'
    OR public.is_admin_or_manager(auth.uid())
  );