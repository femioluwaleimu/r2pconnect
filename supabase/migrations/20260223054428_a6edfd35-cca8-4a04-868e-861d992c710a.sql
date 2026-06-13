
-- Supervisor wallet for revenue tracking
CREATE TABLE public.supervisor_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  total_withdrawn NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supervisor_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors can view own wallet" ON public.supervisor_wallet
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can insert own wallet" ON public.supervisor_wallet
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Supervisors can update own wallet" ON public.supervisor_wallet
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all supervisor wallets" ON public.supervisor_wallet
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all supervisor wallets" ON public.supervisor_wallet
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Commission earnings log (for supervisors, referrers, institutions)
CREATE TABLE public.commission_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL,
  beneficiary_type TEXT NOT NULL,
  student_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT DEFAULT 'credited',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.commission_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commission earnings" ON public.commission_earnings
  FOR SELECT USING (auth.uid() = beneficiary_id);

CREATE POLICY "Admins can view all commission earnings" ON public.commission_earnings
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert commission earnings" ON public.commission_earnings
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Supervisor withdrawals
CREATE TABLE public.supervisor_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supervisor_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors can view own withdrawals" ON public.supervisor_withdrawals
  FOR SELECT USING (auth.uid() = supervisor_id);

CREATE POLICY "Supervisors can insert own withdrawals" ON public.supervisor_withdrawals
  FOR INSERT WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Admins can manage all supervisor withdrawals" ON public.supervisor_withdrawals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_supervisor_wallet_updated_at
  BEFORE UPDATE ON public.supervisor_wallet
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supervisor_withdrawals_updated_at
  BEFORE UPDATE ON public.supervisor_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for beneficiary_type
CREATE OR REPLACE FUNCTION public.validate_commission_beneficiary_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.beneficiary_type NOT IN ('supervisor', 'referrer', 'institution') THEN
    RAISE EXCEPTION 'Invalid beneficiary_type: %. Must be supervisor, referrer, or institution', NEW.beneficiary_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_commission_beneficiary_type_trigger
  BEFORE INSERT OR UPDATE ON public.commission_earnings
  FOR EACH ROW EXECUTE FUNCTION public.validate_commission_beneficiary_type();
