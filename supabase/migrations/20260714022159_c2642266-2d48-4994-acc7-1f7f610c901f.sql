GRANT EXECUTE ON FUNCTION public.get_user_branch(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_expiry_date(date, integer) TO authenticated, anon, service_role;