CREATE TABLE public.installation_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  address text,
  phone text,
  whatsapp text,
  google_maps_url text,
  logo_url text,
  services text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.installation_centers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_centers TO authenticated;
GRANT ALL ON public.installation_centers TO service_role;

ALTER TABLE public.installation_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved active centers"
  ON public.installation_centers FOR SELECT
  USING (is_approved = true AND is_active = true);

CREATE POLICY "Admins can view all centers"
  ON public.installation_centers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert centers"
  ON public.installation_centers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update centers"
  ON public.installation_centers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete centers"
  ON public.installation_centers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_installation_centers_updated_at
  BEFORE UPDATE ON public.installation_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_installation_centers_approved_active ON public.installation_centers (is_approved, is_active, sort_order);