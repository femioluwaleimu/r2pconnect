-- Fix function search path for get_subscription_limits
CREATE OR REPLACE FUNCTION public.get_subscription_limits(tier_name subscription_tier)
RETURNS TABLE(max_challenges INTEGER, ai_matches INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE tier_name
      WHEN 'free' THEN 1
      WHEN 'basic' THEN 5
      WHEN 'pro' THEN 20
      WHEN 'enterprise' THEN 999
    END as max_challenges,
    CASE tier_name
      WHEN 'free' THEN 3
      WHEN 'basic' THEN 10
      WHEN 'pro' THEN 25
      WHEN 'enterprise' THEN 100
    END as ai_matches
$$;