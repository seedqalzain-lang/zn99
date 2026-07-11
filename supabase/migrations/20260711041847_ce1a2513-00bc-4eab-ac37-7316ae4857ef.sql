
CREATE TABLE public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  city text,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  is_approved boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.customer_reviews TO anon;
GRANT SELECT, INSERT ON public.customer_reviews TO authenticated;
GRANT ALL ON public.customer_reviews TO service_role;

ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

-- Public may read only approved reviews
CREATE POLICY "public read approved reviews"
  ON public.customer_reviews FOR SELECT
  USING (is_approved = true);

-- Anyone (anon or authenticated) may submit a review, but only as pending (not approved, not featured)
CREATE POLICY "anyone can submit pending review"
  ON public.customer_reviews FOR INSERT
  WITH CHECK (is_approved = false AND is_featured = false);

-- Admins/super admins may read all, update, delete
CREATE POLICY "admins read all reviews"
  ON public.customer_reviews FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "admins update reviews"
  ON public.customer_reviews FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "admins delete reviews"
  ON public.customer_reviews FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_customer_reviews_updated_at
  BEFORE UPDATE ON public.customer_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_customer_reviews_approved_created
  ON public.customer_reviews (is_approved, created_at DESC);
