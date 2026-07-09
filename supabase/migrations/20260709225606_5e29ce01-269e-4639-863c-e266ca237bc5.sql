
-- 1) Tighten warranties INSERT: customers can only self-insert as pending
DROP POLICY IF EXISTS "warranties insert" ON public.warranties;
CREATE POLICY "warranties insert" ON public.warranties
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'branch_staff'::app_role)
  OR (
    EXISTS (SELECT 1 FROM public.customers c
            WHERE c.id = warranties.customer_id AND c.user_id = auth.uid())
    AND status = 'pending'::warranty_status
  )
);

-- Defense-in-depth: trigger forces status='pending' for non-staff inserters
CREATE OR REPLACE FUNCTION public.warranties_enforce_customer_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'branch_staff'::app_role)
  ) THEN
    NEW.status := 'pending'::warranty_status;
    -- Recompute expiry from activation if we can, else null it
    IF NEW.activation_date IS NOT NULL AND NEW.duration_months IS NOT NULL THEN
      NEW.expiry_date := public.compute_expiry_date(NEW.activation_date, NEW.duration_months);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_warranties_enforce_customer_pending ON public.warranties;
CREATE TRIGGER trg_warranties_enforce_customer_pending
BEFORE INSERT ON public.warranties
FOR EACH ROW EXECUTE FUNCTION public.warranties_enforce_customer_pending();

REVOKE EXECUTE ON FUNCTION public.warranties_enforce_customer_pending() FROM PUBLIC, anon, authenticated;

-- 2) Lock down SECURITY DEFINER functions that must NOT be publicly callable.
--    Keep has_role/get_user_branch executable to authenticated only (required by RLS policies).
REVOKE EXECUTE ON FUNCTION public.generate_warranty_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_warranty_public(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_branch(uuid) FROM PUBLIC, anon;
