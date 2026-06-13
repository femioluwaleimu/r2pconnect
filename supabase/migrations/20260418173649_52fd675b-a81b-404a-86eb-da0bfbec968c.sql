ALTER TABLE public.coupon_codes
ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER;