-- Add ai_matchers_remaining column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS ai_matchers_remaining integer DEFAULT 0;

-- Add new columns to research_papers for comprehensive analysis
ALTER TABLE public.research_papers 
ADD COLUMN IF NOT EXISTS problem_statement text,
ADD COLUMN IF NOT EXISTS solution_approach text,
ADD COLUMN IF NOT EXISTS practical_applications text[];

-- Drop and recreate handle_new_user function with institution_id storage and free plan creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role app_role;
  default_ai_credits integer;
  default_ai_matchers integer;
  default_challenges integer;
BEGIN
  -- Extract role from metadata
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'researcher');
  
  -- Set defaults based on role
  IF user_role = 'researcher' THEN
    default_ai_credits := 2;
    default_ai_matchers := 0;
    default_challenges := 0;
  ELSIF user_role = 'industry' THEN
    default_ai_credits := 0;
    default_ai_matchers := 3;
    default_challenges := 1;
  ELSE
    default_ai_credits := 0;
    default_ai_matchers := 0;
    default_challenges := 0;
  END IF;
  
  -- Insert profile with institution_id from metadata
  INSERT INTO public.profiles (user_id, full_name, email, phone_number, institution_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone_number',
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'institution_id' IS NOT NULL 
        AND NEW.raw_user_meta_data ->> 'institution_id' != '' 
      THEN (NEW.raw_user_meta_data ->> 'institution_id')::uuid 
      ELSE NULL 
    END
  );
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- Create free subscription with role-specific defaults
  INSERT INTO public.subscriptions (
    user_id, 
    tier, 
    is_active,
    ai_credits_remaining,
    ai_matchers_remaining,
    max_challenges_per_month,
    ai_matches_per_challenge,
    current_period_start,
    current_period_end
  )
  VALUES (
    NEW.id,
    'free',
    true,
    default_ai_credits,
    default_ai_matchers,
    default_challenges,
    CASE WHEN user_role = 'industry' THEN 3 ELSE 0 END,
    now(),
    now() + interval '1 month'
  );
  
  RETURN NEW;
END;
$$;