-- Drop the existing insert policy
DROP POLICY IF EXISTS "Industry users can insert challenges" ON public.challenges;

-- Create a proper permissive insert policy
CREATE POLICY "Industry users can insert challenges"
ON public.challenges
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = industry_id AND public.has_role(auth.uid(), 'industry'));