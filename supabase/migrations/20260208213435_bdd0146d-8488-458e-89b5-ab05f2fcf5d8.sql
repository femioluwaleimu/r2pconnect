-- Drop existing policies for coupon_codes
DROP POLICY IF EXISTS "Admins can manage coupon codes" ON public.coupon_codes;
DROP POLICY IF EXISTS "Users can view active coupon codes" ON public.coupon_codes;

-- Create more permissive policies for admins
CREATE POLICY "Admins can insert coupon codes"
ON public.coupon_codes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can update coupon codes"
ON public.coupon_codes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can delete coupon codes"
ON public.coupon_codes FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can view all coupon codes"
ON public.coupon_codes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can view active valid coupon codes"
ON public.coupon_codes FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (valid_until IS NULL OR valid_until > now())
);

-- Add credits_awarded column for referred users if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'referral_usages' 
    AND column_name = 'referred_credits_awarded'
  ) THEN
    ALTER TABLE public.referral_usages ADD COLUMN referred_credits_awarded integer DEFAULT 5;
  END IF;
END $$;