
-- Credit top-up packages (admin-configurable)
CREATE TABLE public.credit_topup_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  amount_usd numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.credit_topup_packages ENABLE ROW LEVEL SECURITY;

-- Anyone can view active packages
CREATE POLICY "Anyone can view active topup packages" ON public.credit_topup_packages
  FOR SELECT USING (is_active = true);

-- Admins can manage all packages
CREATE POLICY "Admins can manage topup packages" ON public.credit_topup_packages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Credit top-up purchase history
CREATE TABLE public.credit_topup_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid REFERENCES public.credit_topup_packages(id),
  credits integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'NGN',
  reference text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.credit_topup_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view own purchases
CREATE POLICY "Users can view own topup purchases" ON public.credit_topup_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can insert own purchases
CREATE POLICY "Users can insert own topup purchases" ON public.credit_topup_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can view all purchases
CREATE POLICY "Admins can view all topup purchases" ON public.credit_topup_purchases
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
