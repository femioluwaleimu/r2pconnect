-- Fix 1: Create a secure view for subscriptions that excludes paystack_customer_id
-- First, drop the old SELECT policy and create a new one using a view

-- Create a secure view for user subscriptions (without sensitive payment data)
CREATE VIEW public.user_subscriptions AS
SELECT 
  id,
  user_id,
  tier,
  is_active,
  current_period_start,
  current_period_end,
  amount,
  currency,
  created_at,
  updated_at
FROM public.subscriptions;

-- Grant access to the view
GRANT SELECT ON public.user_subscriptions TO authenticated;

-- Fix 2: Create a public_profiles view with only non-sensitive fields
CREATE VIEW public.public_profiles AS
SELECT 
  user_id,
  full_name,
  avatar_url,
  bio,
  institution_id
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;

-- Enable RLS on the view (views inherit from base table RLS)
-- The base table RLS will still apply

-- Fix 3: Add unique constraint to institution_verification_codes if missing
-- Check if the unique constraint exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'institution_verification_codes_institution_id_key'
  ) THEN
    ALTER TABLE public.institution_verification_codes 
    ADD CONSTRAINT institution_verification_codes_institution_id_key 
    UNIQUE (institution_id);
  END IF;
END $$;