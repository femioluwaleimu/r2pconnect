-- Drop the existing update policy
DROP POLICY IF EXISTS "Industry users can update own challenges" ON public.challenges;

-- Create a proper permissive update policy with both USING and WITH CHECK
CREATE POLICY "Industry users can update own challenges"
ON public.challenges
FOR UPDATE
TO authenticated
USING (auth.uid() = industry_id)
WITH CHECK (auth.uid() = industry_id);