-- Revoke anon execute on the new helper functions added in this batch.
REVOKE EXECUTE ON FUNCTION public.is_owner_equivalent(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_lead_access(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_project_access(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_team(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_sales(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_owner_equivalent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_lead_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_sales(uuid) TO authenticated;
