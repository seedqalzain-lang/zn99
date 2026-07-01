
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin', 'branch_staff', 'customer');
CREATE TYPE public.warranty_status AS ENUM ('active', 'expired', 'cancelled');

-- ============= CUSTOMERS =============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_user_id ON public.customers(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ============= BRANCHES =============
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.branches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- ============= WARRANTY BRANDS =============
CREATE TABLE public.warranty_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.warranty_brands TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.warranty_brands TO authenticated;
GRANT ALL ON public.warranty_brands TO service_role;
ALTER TABLE public.warranty_brands ENABLE ROW LEVEL SECURITY;

-- ============= FILM TYPES =============
CREATE TABLE public.film_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_id UUID REFERENCES public.warranty_brands(id) ON DELETE SET NULL,
  warranty_months INT NOT NULL DEFAULT 12,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.film_types TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.film_types TO authenticated;
GRANT ALL ON public.film_types TO service_role;
ALTER TABLE public.film_types ENABLE ROW LEVEL SECURITY;

-- ============= WARRANTIES =============
CREATE TABLE public.warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  brand_id UUID REFERENCES public.warranty_brands(id) ON DELETE SET NULL,
  film_type_id UUID REFERENCES public.film_types(id) ON DELETE SET NULL,
  vin TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  status public.warranty_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_warranties_customer ON public.warranties(customer_id);
CREATE INDEX idx_warranties_number ON public.warranties(warranty_number);
CREATE INDEX idx_warranties_branch ON public.warranties(branch_id);
CREATE INDEX idx_warranties_status ON public.warranties(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warranties TO authenticated;
GRANT ALL ON public.warranties TO service_role;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============= HELPER FUNCTIONS =============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_branch(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT branch_id FROM public.user_roles WHERE user_id = _user_id AND role = 'branch_staff' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.generate_warranty_number()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_num TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    new_num := 'TM-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 999999)::int)::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.warranties WHERE warranty_number = new_num);
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique warranty number';
    END IF;
  END LOOP;
  RETURN new_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON public.warranty_brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_film_updated BEFORE UPDATE ON public.film_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_warranties_updated BEFORE UPDATE ON public.warranties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create customer + assign 'customer' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.customers (user_id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'عميل'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update warranty status when expiry passes (checked on read via view or admin action)
CREATE OR REPLACE FUNCTION public.compute_expiry_date(_activation DATE, _months INT)
RETURNS DATE LANGUAGE SQL IMMUTABLE AS $$
  SELECT (_activation + (_months || ' months')::interval)::date;
$$;

-- ============= RLS POLICIES =============

-- customers
CREATE POLICY "customers self read" ON public.customers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'branch_staff'));
CREATE POLICY "customers self update" ON public.customers FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "customers admin insert" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'branch_staff') OR user_id = auth.uid());
CREATE POLICY "customers admin delete" ON public.customers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- branches: public read (needed for activation form), admin write
CREATE POLICY "branches public read" ON public.branches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "branches admin write" ON public.branches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "branches admin update" ON public.branches FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "branches admin delete" ON public.branches FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- warranty_brands: public read
CREATE POLICY "wbrands public read" ON public.warranty_brands FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "wbrands admin write" ON public.warranty_brands FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wbrands admin update" ON public.warranty_brands FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wbrands admin delete" ON public.warranty_brands FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- film_types: public read
CREATE POLICY "film public read" ON public.film_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "film admin write" ON public.film_types FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "film admin update" ON public.film_types FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "film admin delete" ON public.film_types FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- warranties: customer sees own, staff sees branch, admin sees all
CREATE POLICY "warranties read" ON public.warranties FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'branch_staff') AND branch_id = public.get_user_branch(auth.uid()))
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = warranties.customer_id AND c.user_id = auth.uid())
  );
CREATE POLICY "warranties insert" ON public.warranties FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'branch_staff')
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = warranties.customer_id AND c.user_id = auth.uid())
  );
CREATE POLICY "warranties update" ON public.warranties FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'branch_staff') AND branch_id = public.get_user_branch(auth.uid()))
  );
CREATE POLICY "warranties delete" ON public.warranties FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: users see own, admin sees all
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles admin write" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles admin update" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles admin delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============= SEED DATA =============
INSERT INTO public.branches (name, address, phone, sort_order) VALUES
  ('الفرع الرئيسي - صنعاء', 'شارع 22 مايو، جوار فندق الأحلام، قبل جولة الثقافة', '782222919', 1);

INSERT INTO public.warranty_brands (name, sort_order) VALUES
  ('XPEL', 1), ('SunTek', 2), ('LLumar', 3), ('3M', 4), ('STEK', 5), ('أخرى', 99);

INSERT INTO public.film_types (name, warranty_months, description, sort_order) VALUES
  ('PPF - حماية الطلاء', 60, 'فيلم حماية شفاف للطلاء لمدة 5 سنوات', 1),
  ('نانو سيراميك', 24, 'طبقة نانو سيراميك واقية لمدة سنتين', 2),
  ('تظليل زجاج', 36, 'عازل حراري للزجاج لمدة 3 سنوات', 3),
  ('تلميع وحماية', 12, 'تلميع احترافي وحماية لمدة سنة', 4);
