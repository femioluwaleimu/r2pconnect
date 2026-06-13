-- Drop the existing update policy for industry users
DROP POLICY IF EXISTS "Industry users can update own challenges" ON public.challenges;

-- Create a simpler update policy without WITH CHECK
-- The USING clause is sufficient for updates as it ensures only rows owned by the user can be updated
CREATE POLICY "Industry users can update own challenges"
ON public.challenges
FOR UPDATE
TO authenticated
USING (auth.uid() = industry_id);