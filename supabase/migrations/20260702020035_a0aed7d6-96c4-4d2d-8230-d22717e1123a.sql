-- Set immutable search_path on compute_expiry_date
CREATE OR REPLACE FUNCTION public.compute_expiry_date(_activation date, _months integer)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path = public
AS $function$
  SELECT (_activation + (_months || ' months')::interval)::date;
$function$;

-- Revoke public EXECUTE on SECURITY DEFINER functions that must not be callable via the Data API.
-- has_role stays executable (needed by RLS policies evaluated as the caller).
-- verify_warranty_public stays executable (intentional public verification endpoint).
REVOKE EXECUTE ON FUNCTION public.generate_warranty_number() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_branch(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compute_expiry_date(date, integer) FROM anon, authenticated, PUBLIC;