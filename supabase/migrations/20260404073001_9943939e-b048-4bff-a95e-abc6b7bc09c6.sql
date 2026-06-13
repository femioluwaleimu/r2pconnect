CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    phone_number,
    institution_id,
    researcher_type,
    assigned_supervisor_id,
    department
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone_number', ''),
    NULLIF(NEW.raw_user_meta_data->>'institution_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'researcher_type', ''),
    NULLIF(NEW.raw_user_meta_data->>'assigned_supervisor_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'department', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    institution_id = COALESCE(EXCLUDED.institution_id, profiles.institution_id),
    researcher_type = COALESCE(EXCLUDED.researcher_type, profiles.researcher_type),
    assigned_supervisor_id = COALESCE(EXCLUDED.assigned_supervisor_id, profiles.assigned_supervisor_id),
    department = COALESCE(EXCLUDED.department, profiles.department);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', '')::public.app_role, 'researcher')
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  IF (NEW.raw_user_meta_data->>'role') = 'ipn' THEN
    INSERT INTO public.ipn_profiles (
      user_id,
      company_name,
      means_of_identification,
      what_do_you_do
    )
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name', ''), 'IPN Profile'),
      NULLIF(NEW.raw_user_meta_data->>'means_of_identification', ''),
      NULLIF(NEW.raw_user_meta_data->>'what_do_you_do', '')
    )
    ON CONFLICT (user_id) DO UPDATE SET
      company_name = COALESCE(NULLIF(EXCLUDED.company_name, ''), ipn_profiles.company_name),
      means_of_identification = COALESCE(EXCLUDED.means_of_identification, ipn_profiles.means_of_identification),
      what_do_you_do = COALESCE(EXCLUDED.what_do_you_do, ipn_profiles.what_do_you_do),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;