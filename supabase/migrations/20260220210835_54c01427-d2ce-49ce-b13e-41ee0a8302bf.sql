
-- Recreate public_profiles view WITHOUT security_invoker so it acts as security definer
-- This allows anonymous/public access to basic profile info (name, avatar, bio, institution)
-- while the base profiles table remains protected by RLS
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
  SELECT user_id, full_name, avatar_url, bio, institution_id
  FROM public.profiles;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;
