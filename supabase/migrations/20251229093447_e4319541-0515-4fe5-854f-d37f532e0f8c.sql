-- Drop the existing restrictive update policy and create a simpler one
DROP POLICY IF EXISTS "Industry users can update own challenges" ON public.challenges;

-- Create a new policy that allows industry users to update their own challenges without restrictive WITH CHECK
CREATE POLICY "Industry users can update own challenges" 
ON public.challenges 
FOR UPDATE 
USING (auth.uid() = industry_id);

-- Also add a SELECT policy for industry users to see their inactive challenges
DROP POLICY IF EXISTS "Industry can view own challenges" ON public.challenges;
CREATE POLICY "Industry can view own challenges" 
ON public.challenges 
FOR SELECT 
USING (auth.uid() = industry_id);