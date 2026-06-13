
-- Update handle_new_user to also save department from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
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
  RETURN NEW;
END;
$$;
