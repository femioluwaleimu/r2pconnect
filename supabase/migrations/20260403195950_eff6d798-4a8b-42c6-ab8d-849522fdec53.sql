
-- Add ipn and job_applicant to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ipn';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'job_applicant';

-- IPN Profiles
CREATE TABLE public.ipn_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL DEFAULT '',
  bio text,
  logo_url text,
  location text,
  phone text,
  website text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.ipn_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "IPN users can view own profile" ON public.ipn_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "IPN users can insert own profile" ON public.ipn_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "IPN users can update own profile" ON public.ipn_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all ipn profiles" ON public.ipn_profiles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ipn_profiles_updated_at BEFORE UPDATE ON public.ipn_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- IPN Companies
CREATE TABLE public.ipn_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ipn_user_id uuid NOT NULL,
  name text NOT NULL,
  logo_url text,
  industry text,
  location text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.ipn_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "IPN users can view own companies" ON public.ipn_companies FOR SELECT USING (auth.uid() = ipn_user_id);
CREATE POLICY "IPN users can insert own companies" ON public.ipn_companies FOR INSERT WITH CHECK (auth.uid() = ipn_user_id);
CREATE POLICY "IPN users can update own companies" ON public.ipn_companies FOR UPDATE USING (auth.uid() = ipn_user_id);
CREATE POLICY "IPN users can delete own companies" ON public.ipn_companies FOR DELETE USING (auth.uid() = ipn_user_id);
CREATE POLICY "Admins can manage all ipn companies" ON public.ipn_companies FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view active companies" ON public.ipn_companies FOR SELECT USING (is_active = true);

CREATE TRIGGER update_ipn_companies_updated_at BEFORE UPDATE ON public.ipn_companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- IPN Opportunities
CREATE TABLE public.ipn_opportunities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.ipn_companies(id) ON DELETE CASCADE,
  ipn_user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  job_type text NOT NULL DEFAULT 'internship',
  location text,
  is_paid boolean NOT NULL DEFAULT false,
  application_fee_ngn numeric NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  deadline timestamp with time zone,
  slots_available integer DEFAULT 1,
  slots_filled integer DEFAULT 0,
  requirements text[],
  responsibilities text[],
  duration text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.ipn_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "IPN users can view own opportunities" ON public.ipn_opportunities FOR SELECT USING (auth.uid() = ipn_user_id);
CREATE POLICY "IPN users can insert own opportunities" ON public.ipn_opportunities FOR INSERT WITH CHECK (auth.uid() = ipn_user_id);
CREATE POLICY "IPN users can update own opportunities" ON public.ipn_opportunities FOR UPDATE USING (auth.uid() = ipn_user_id);
CREATE POLICY "IPN users can delete own opportunities" ON public.ipn_opportunities FOR DELETE USING (auth.uid() = ipn_user_id);
CREATE POLICY "Admins can manage all ipn opportunities" ON public.ipn_opportunities FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view published opportunities" ON public.ipn_opportunities FOR SELECT USING (is_published = true);

CREATE TRIGGER update_ipn_opportunities_updated_at BEFORE UPDATE ON public.ipn_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- IPN Applications
CREATE TABLE public.ipn_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id uuid NOT NULL REFERENCES public.ipn_opportunities(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL,
  applicant_name text,
  applicant_email text,
  cover_letter text,
  profile_snapshot jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  payment_reference text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.ipn_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view own applications" ON public.ipn_applications FOR SELECT USING (auth.uid() = applicant_id);
CREATE POLICY "Applicants can insert own applications" ON public.ipn_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "IPN users can view applications to their opportunities" ON public.ipn_applications FOR SELECT USING (
  opportunity_id IN (SELECT id FROM public.ipn_opportunities WHERE ipn_user_id = auth.uid())
);
CREATE POLICY "IPN users can update applications to their opportunities" ON public.ipn_applications FOR UPDATE USING (
  opportunity_id IN (SELECT id FROM public.ipn_opportunities WHERE ipn_user_id = auth.uid())
);
CREATE POLICY "Admins can manage all ipn applications" ON public.ipn_applications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ipn_applications_updated_at BEFORE UPDATE ON public.ipn_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- IPN Payments
CREATE TABLE public.ipn_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid REFERENCES public.ipn_applications(id) ON DELETE SET NULL,
  applicant_id uuid NOT NULL,
  opportunity_id uuid NOT NULL REFERENCES public.ipn_opportunities(id) ON DELETE CASCADE,
  amount_ngn numeric NOT NULL DEFAULT 0,
  paystack_reference text,
  ipn_share_ngn numeric NOT NULL DEFAULT 0,
  platform_share_ngn numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.ipn_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view own payments" ON public.ipn_payments FOR SELECT USING (auth.uid() = applicant_id);
CREATE POLICY "IPN users can view payments for their opportunities" ON public.ipn_payments FOR SELECT USING (
  opportunity_id IN (SELECT id FROM public.ipn_opportunities WHERE ipn_user_id = auth.uid())
);
CREATE POLICY "Admins can manage all ipn payments" ON public.ipn_payments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- IPN Wallet
CREATE TABLE public.ipn_wallet (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.ipn_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "IPN users can view own wallet" ON public.ipn_wallet FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "IPN users can insert own wallet" ON public.ipn_wallet FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "IPN users can update own wallet" ON public.ipn_wallet FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all ipn wallets" ON public.ipn_wallet FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ipn_wallet_updated_at BEFORE UPDATE ON public.ipn_wallet FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- IPN Payout Requests
CREATE TABLE public.ipn_payout_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.ipn_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "IPN users can view own payout requests" ON public.ipn_payout_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "IPN users can insert own payout requests" ON public.ipn_payout_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all ipn payout requests" ON public.ipn_payout_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ipn_payout_requests_updated_at BEFORE UPDATE ON public.ipn_payout_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default IPN revenue sharing settings
INSERT INTO public.platform_settings (key, value, type)
VALUES 
  ('ipn_share_percent', '80', 'number'),
  ('ipn_platform_share_percent', '20', 'number')
ON CONFLICT (key) DO NOTHING;
