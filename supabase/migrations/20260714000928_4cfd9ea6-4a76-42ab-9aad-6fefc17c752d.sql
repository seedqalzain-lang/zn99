-- Revoke default PUBLIC execute on SECURITY DEFINER functions, then grant narrowly.

-- Internal-only helpers and trigger functions: no direct callers
REVOKE ALL ON FUNCTION public.generate_warranty_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_branch(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.warranties_enforce_customer_pending() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.compute_expiry_date(date, integer) FROM PUBLIC, anon, authenticated;

-- has_role is called by RLS policies and by signed-in users' RPCs
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Public warranty verification lookup (used from the public verify page and MCP tool)
REVOKE ALL ON FUNCTION public.verify_warranty_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_warranty_public(text) TO anon, authenticated, service_role;

-- compute_expiry_date is IMMUTABLE and used inside triggers/policies via definer context
GRANT EXECUTE ON FUNCTION public.compute_expiry_date(date, integer) TO service_role;
