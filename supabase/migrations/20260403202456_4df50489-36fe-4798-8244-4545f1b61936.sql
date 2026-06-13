
-- Add new columns to ipn_profiles
ALTER TABLE public.ipn_profiles
ADD COLUMN IF NOT EXISTS means_of_identification TEXT,
ADD COLUMN IF NOT EXISTS what_do_you_do TEXT;

-- Update handle_new_user to create ipn_profiles for IPN users
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name, phone_number, institution_id, researcher_type, assigned_supervisor_id, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone_number',
    (NEW.raw_user_meta_data->>'institution_id')::uuid,
    NEW.raw_user_meta_data->>'researcher_type',
    (NEW.raw_user_meta_data->>'assigned_supervisor_id')::uuid,
    NEW.raw_user_meta_data->>'department'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    institution_id = COALESCE(EXCLUDED.institution_id, profiles.institution_id),
    researcher_type = COALESCE(EXCLUDED.researcher_type, profiles.researcher_type),
    assigned_supervisor_id = COALESCE(EXCLUDED.assigned_supervisor_id, profiles.assigned_supervisor_id),
    department = COALESCE(EXCLUDED.department, profiles.department);

  -- Insert user role from metadata (default to 'researcher' if not specified)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'researcher')
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  -- If IPN role, create ipn_profiles row
  IF (NEW.raw_user_meta_data->>'role') = 'ipn' THEN
    INSERT INTO public.ipn_profiles (user_id, company_name, means_of_identification, what_do_you_do)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
      NEW.raw_user_meta_data->>'means_of_identification',
      NEW.raw_user_meta_data->>'what_do_you_do'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
