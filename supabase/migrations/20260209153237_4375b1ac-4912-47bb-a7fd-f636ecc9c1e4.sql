
-- Create payment_history table for tracking subscription payments
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reference TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  plan_name TEXT NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  payment_method TEXT,
  coupon_code TEXT,
  discount_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payment history
CREATE POLICY "Users can view own payment history"
  ON public.payment_history FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (from edge functions)
CREATE POLICY "Service role can insert payment history"
  ON public.payment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX idx_payment_history_created_at ON public.payment_history(created_at DESC);
