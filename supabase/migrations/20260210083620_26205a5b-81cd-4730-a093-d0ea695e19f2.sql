
-- Create a trigger function that automatically marks external supervisor invites as accepted
-- when a new external supervisor record is created
CREATE OR REPLACE FUNCTION public.auto_accept_external_supervisor_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  supervisor_email TEXT;
BEGIN
  -- Only process external supervisors
  IF NEW.is_external = true THEN
    -- Get the email of the new supervisor
    SELECT email INTO supervisor_email FROM auth.users WHERE id = NEW.user_id;
    
    IF supervisor_email IS NOT NULL THEN
      -- Update all pending invites for this email to accepted
      UPDATE public.external_supervisor_invites
      SET status = 'accepted', accepted_at = now()
      WHERE email = supervisor_email
        AND status = 'pending';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_external_supervisor_created
  AFTER INSERT ON public.supervisors
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_accept_external_supervisor_invite();
