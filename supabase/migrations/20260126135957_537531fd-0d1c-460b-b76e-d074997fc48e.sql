-- Create table to track supervisor AI credits based on student subscriptions
CREATE TABLE IF NOT EXISTS public.supervisor_ai_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INT NOT NULL DEFAULT 0,
  credits_limit INT NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(supervisor_id)
);

-- Enable RLS
ALTER TABLE public.supervisor_ai_credits ENABLE ROW LEVEL SECURITY;

-- Policy for supervisors to read their own credits
CREATE POLICY "Supervisors can view own credits"
ON public.supervisor_ai_credits
FOR SELECT
TO authenticated
USING (auth.uid() = supervisor_id);

-- Policy for service role to update (edge functions)
CREATE POLICY "Service role can manage credits"
ON public.supervisor_ai_credits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create trigger to update updated_at
CREATE TRIGGER update_supervisor_ai_credits_updated_at
BEFORE UPDATE ON public.supervisor_ai_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate and refresh supervisor credits
CREATE OR REPLACE FUNCTION public.calculate_supervisor_credits(p_supervisor_id UUID)
RETURNS TABLE(total_credits INT, student_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_credits INT := 0;
  v_student_count INT := 0;
  v_student RECORD;
BEGIN
  -- Loop through all active students assigned to this supervisor
  FOR v_student IN
    SELECT DISTINCT rp.author_id
    FROM research_papers rp
    WHERE rp.supervisor_id = p_supervisor_id
      AND rp.research_type = 'student'
  LOOP
    v_student_count := v_student_count + 1;
    
    -- Get student's subscription
    DECLARE
      v_tier TEXT;
      v_plan_credits INT;
      v_student_credits INT;
    BEGIN
      SELECT s.tier, sp.ai_credits_per_day
      INTO v_tier, v_plan_credits
      FROM subscriptions s
      LEFT JOIN subscription_plans sp ON sp.plan_id = 'researcher_' || s.tier AND sp.is_active = true
      WHERE s.user_id = v_student.author_id;
      
      IF v_tier IS NULL OR v_tier = 'free' THEN
        -- Free plan student: supervisor gets 3 credits
        v_student_credits := 3;
      ELSE
        -- Paid plan student: supervisor gets 2/3 of student's total credits
        v_student_credits := COALESCE(FLOOR(v_plan_credits * 2.0 / 3.0)::INT, 3);
      END IF;
      
      v_total_credits := v_total_credits + v_student_credits;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_total_credits, v_student_count;
END;
$$;

-- Add realtime for supervisor credits
ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisor_ai_credits;