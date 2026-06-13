-- Fix security definer views - recreate them with SECURITY INVOKER

-- Drop and recreate user_subscriptions view with SECURITY INVOKER
DROP VIEW IF EXISTS public.user_subscriptions;
CREATE VIEW public.user_subscriptions 
WITH (security_invoker = true) AS
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

-- Drop and recreate public_profiles view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  user_id,
  full_name,
  avatar_url,
  bio,
  institution_id
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;