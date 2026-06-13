-- Create institution_commissions table for tracking 10% commission from researcher subscriptions
CREATE TABLE public.institution_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  researcher_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  commission_rate NUMERIC NOT NULL DEFAULT 0.10,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create institution_withdrawals table for tracking withdrawal requests
CREATE TABLE public.institution_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add total_commission column to institutions table
ALTER TABLE public.institutions
ADD COLUMN total_commission NUMERIC DEFAULT 0,
ADD COLUMN available_balance NUMERIC DEFAULT 0;

-- Enable RLS on institution_commissions
ALTER TABLE public.institution_commissions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on institution_withdrawals
ALTER TABLE public.institution_withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies for institution_commissions
CREATE POLICY "Institution admins can view their commissions"
ON public.institution_commissions
FOR SELECT
USING (institution_id IN (
  SELECT id FROM public.institutions WHERE admin_user_id = auth.uid()
));

CREATE POLICY "Service role can insert commissions"
ON public.institution_commissions
FOR INSERT
WITH CHECK (true);

-- Policies for institution_withdrawals
CREATE POLICY "Institution admins can view their withdrawals"
ON public.institution_withdrawals
FOR SELECT
USING (institution_id IN (
  SELECT id FROM public.institutions WHERE admin_user_id = auth.uid()
));

CREATE POLICY "Institution admins can insert withdrawals"
ON public.institution_withdrawals
FOR INSERT
WITH CHECK (institution_id IN (
  SELECT id FROM public.institutions WHERE admin_user_id = auth.uid()
));

CREATE POLICY "Admins can manage all withdrawals"
ON public.institution_withdrawals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_institution_commissions_updated_at
BEFORE UPDATE ON public.institution_commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_institution_withdrawals_updated_at
BEFORE UPDATE ON public.institution_withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();