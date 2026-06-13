-- Create coupon codes table for subscription discounts
CREATE TABLE public.coupon_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  user_type VARCHAR(50) DEFAULT 'researcher',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coupon usage tracking table
CREATE TABLE public.coupon_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  original_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  final_amount DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

-- Enable RLS
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- Policies for coupon_codes
CREATE POLICY "Admins can manage coupon codes"
ON public.coupon_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "Users can view active coupon codes"
ON public.coupon_codes
FOR SELECT
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Policies for coupon_usages
CREATE POLICY "Users can view their own coupon usages"
ON public.coupon_usages
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own coupon usages"
ON public.coupon_usages
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all coupon usages"
ON public.coupon_usages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_coupon_codes_updated_at
BEFORE UPDATE ON public.coupon_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();