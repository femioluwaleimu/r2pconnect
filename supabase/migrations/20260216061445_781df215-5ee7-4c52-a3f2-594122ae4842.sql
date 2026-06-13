
-- 1. Add new columns to supervisors table
ALTER TABLE public.supervisors 
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS academic_rank text,
  ADD COLUMN IF NOT EXISTS staff_id text;

-- Update existing supervisors to 'verified' since they were invited by institutions
UPDATE public.supervisors SET verification_status = 'verified' WHERE verification_status = 'pending_verification';

-- 2. Create supervisor_student_invites table
CREATE TABLE IF NOT EXISTS public.supervisor_student_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL,
  institution_id uuid,
  department text,
  invite_code text NOT NULL UNIQUE,
  max_students integer DEFAULT 10,
  used_count integer DEFAULT 0,
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.supervisor_student_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors can create their own invites"
  ON public.supervisor_student_invites FOR INSERT
  WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Supervisors can view their own invites"
  ON public.supervisor_student_invites FOR SELECT
  USING (auth.uid() = supervisor_id);

CREATE POLICY "Supervisors can update their own invites"
  ON public.supervisor_student_invites FOR UPDATE
  USING (auth.uid() = supervisor_id);

CREATE POLICY "Public can view active invites by code"
  ON public.supervisor_student_invites FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage all invites"
  ON public.supervisor_student_invites FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create supervisor_activity_logs table
CREATE TABLE IF NOT EXISTS public.supervisor_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL,
  student_id uuid,
  research_id uuid,
  action_type text NOT NULL,
  details text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.supervisor_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors can view their own logs"
  ON public.supervisor_activity_logs FOR SELECT
  USING (auth.uid() = supervisor_id);

CREATE POLICY "Supervisors can insert their own logs"
  ON public.supervisor_activity_logs FOR INSERT
  WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Admins can view all logs"
  ON public.supervisor_activity_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Institution admins can view logs for their supervisors"
  ON public.supervisor_activity_logs FOR SELECT
  USING (
    supervisor_id IN (
      SELECT s.user_id FROM supervisors s 
      JOIN institutions i ON i.id = s.institution_id 
      WHERE i.admin_user_id = auth.uid()
    )
  );

-- 4. Add trigger for updated_at on supervisor_student_invites
CREATE TRIGGER update_supervisor_student_invites_updated_at
  BEFORE UPDATE ON public.supervisor_student_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Update handle_new_user to handle supervisor role
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
  
  -- Insert profile with institution_id from metadata
  INSERT INTO public.profiles (user_id, full_name, email, phone_number, institution_id, department)
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
    NEW.raw_user_meta_data ->> 'department'
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
      false  -- Not active until verified
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

-- 6. RLS policy for admins to update supervisors verification
CREATE POLICY "Admins can update all supervisors"
  ON public.supervisors FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all supervisors"
  ON public.supervisors FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
