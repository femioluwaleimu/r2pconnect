
-- Add assigned_supervisor_id to profiles for students registered via supervisor invite
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_supervisor_id uuid;

-- Update handle_new_user to set researcher_type from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    default_ai_credits := 3;
    default_ai_matchers := 0;
    default_challenges := 0;
  ELSIF user_role = 'industry' THEN
    default_ai_credits := 0;
    default_ai_matchers := 3;
    default_challenges := 1;
  ELSIF user_role = 'supervisor' THEN
    default_ai_credits := 3;
    default_ai_matchers := 0;
    default_challenges := 0;
  ELSE
    default_ai_credits := 0;
    default_ai_matchers := 0;
    default_challenges := 0;
  END IF;
  
  -- Insert profile with institution_id and researcher_type from metadata
  INSERT INTO public.profiles (user_id, full_name, email, phone_number, institution_id, department, researcher_type, assigned_supervisor_id)
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
    END,
    NEW.raw_user_meta_data ->> 'department',
    NEW.raw_user_meta_data ->> 'researcher_type',
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'assigned_supervisor_id' IS NOT NULL 
        AND NEW.raw_user_meta_data ->> 'assigned_supervisor_id' != '' 
      THEN (NEW.raw_user_meta_data ->> 'assigned_supervisor_id')::uuid 
      ELSE NULL 
    END
  );
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- Create supervisor record if role is supervisor
  IF user_role = 'supervisor' THEN
    INSERT INTO public.supervisors (user_id, institution_id, department, academic_rank, staff_id, verification_status, is_active)
    VALUES (
      NEW.id,
      CASE 
        WHEN NEW.raw_user_meta_data ->> 'institution_id' IS NOT NULL 
          AND NEW.raw_user_meta_data ->> 'institution_id' != '' 
        THEN (NEW.raw_user_meta_data ->> 'institution_id')::uuid 
        ELSE NULL 
      END,
      NEW.raw_user_meta_data ->> 'department',
      NEW.raw_user_meta_data ->> 'academic_rank',
      NEW.raw_user_meta_data ->> 'staff_id',
      'pending_verification',
      false
    );
  END IF;
  
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
$function$;
