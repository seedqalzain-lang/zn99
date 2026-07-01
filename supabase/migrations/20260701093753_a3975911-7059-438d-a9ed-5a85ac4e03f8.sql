
CREATE OR REPLACE FUNCTION public.verify_warranty_public(_num TEXT)
RETURNS TABLE (
  warranty_number TEXT,
  activation_date DATE,
  expiry_date DATE,
  status public.warranty_status,
  vin TEXT,
  customer_name TEXT,
  brand_name TEXT,
  film_type_name TEXT,
  branch_name TEXT
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    w.warranty_number,
    w.activation_date,
    w.expiry_date,
    w.status,
    w.vin,
    c.full_name,
    b.name,
    f.name,
    br.name
  FROM public.warranties w
  JOIN public.customers c ON c.id = w.customer_id
  LEFT JOIN public.warranty_brands b ON b.id = w.brand_id
  LEFT JOIN public.film_types f ON f.id = w.film_type_id
  LEFT JOIN public.branches br ON br.id = w.branch_id
  WHERE w.warranty_number = _num
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_warranty_public(TEXT) TO anon, authenticated;
