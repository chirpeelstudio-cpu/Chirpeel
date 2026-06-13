-- team_invites table for admin-confirmed team member invitations
CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  email text NOT NULL,
  name text,
  phone text,
  proposed_role text NOT NULL DEFAULT 'sales',
  status text NOT NULL DEFAULT 'pending',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_tenant ON public.team_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON public.team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON public.team_invites(token);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_invites_admin_manage ON public.team_invites;
CREATE POLICY tenant_invites_admin_manage ON public.team_invites
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()))
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin_or_manager(auth.uid()));

-- Public token lookup (anon can read a single invite by token to accept it)
DROP POLICY IF EXISTS public_invite_token_lookup ON public.team_invites;
CREATE POLICY public_invite_token_lookup ON public.team_invites
  FOR SELECT TO anon, authenticated
  USING (status = 'pending' AND expires_at > now());

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_team_invites_updated_at ON public.team_invites;
CREATE TRIGGER trg_team_invites_updated_at
  BEFORE UPDATE ON public.team_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPC to accept invite: validates token, creates team_member row, assigns role
CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.team_invites%ROWTYPE;
  v_uid uuid := auth.uid();
  v_user_email text;
  v_role app_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite FROM public.team_invites
    WHERE token = _token AND status = 'pending' AND expires_at > now()
    LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_uid;
  IF lower(v_user_email) <> lower(v_invite.email) THEN
    RAISE EXCEPTION 'This invite is for a different email address';
  END IF;

  -- Add to tenant_members
  INSERT INTO public.tenant_members (tenant_id, user_id)
    VALUES (v_invite.tenant_id, v_uid)
    ON CONFLICT DO NOTHING;

  -- Assign role (cast text to app_role; fall back to 'sales' if invalid)
  BEGIN
    v_role := v_invite.proposed_role::app_role;
  EXCEPTION WHEN others THEN
    v_role := 'sales'::app_role;
  END;

  INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, v_role)
    ON CONFLICT DO NOTHING;

  -- Create team_member row if not exists
  INSERT INTO public.team_members (tenant_id, user_id, name, email, phone, role, active)
    VALUES (v_invite.tenant_id, v_uid, COALESCE(v_invite.name, v_user_email), v_invite.email, v_invite.phone, v_invite.proposed_role, true);

  -- Mark invite accepted
  UPDATE public.team_invites
    SET status = 'accepted', accepted_at = now(), accepted_user_id = v_uid, updated_at = now()
    WHERE id = v_invite.id;

  RETURN jsonb_build_object('tenant_id', v_invite.tenant_id, 'role', v_invite.proposed_role);
END;
$$;