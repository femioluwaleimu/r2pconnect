-- The existing UPDATE policy is already correct (auth.uid() = industry_id)
-- But we need to make sure it covers all update operations including is_active toggle

-- Drop the existing permissive policy and recreate with explicit coverage
DROP POLICY IF EXISTS "Industry can update own job postings" ON public.job_postings;

-- Create comprehensive UPDATE policy for industry users on their own job postings
CREATE POLICY "Industry can update own job postings" 
ON public.job_postings 
FOR UPDATE 
USING (auth.uid() = industry_id);

-- Also ensure industry users can see their own inactive postings
DROP POLICY IF EXISTS "Industry can view own job postings" ON public.job_postings;
CREATE POLICY "Industry can view own job postings"
ON public.job_postings
FOR SELECT
USING (auth.uid() = industry_id);