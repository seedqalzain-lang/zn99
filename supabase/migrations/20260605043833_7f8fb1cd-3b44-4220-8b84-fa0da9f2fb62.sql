CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name text NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 100),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id, created_at DESC);

GRANT SELECT, INSERT ON public.product_reviews TO anon, authenticated;
GRANT ALL ON public.product_reviews TO service_role;

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read reviews" ON public.product_reviews FOR SELECT USING (true);
CREATE POLICY "public insert reviews" ON public.product_reviews FOR INSERT WITH CHECK (true);