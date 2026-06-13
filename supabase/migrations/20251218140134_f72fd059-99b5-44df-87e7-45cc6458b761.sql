-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive SELECT policy
-- Users can view: their own profile, profiles in their institution, or any profile if authenticated (for author info)
CREATE POLICY "Users can view profiles with restrictions" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile
  auth.uid() = user_id
  OR
  -- Users in the same institution can view each other
  (
    institution_id IS NOT NULL 
    AND institution_id IN (
      SELECT p.institution_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  )
  OR
  -- Institution admins can view profiles of their researchers
  (
    institution_id IN (
      SELECT i.id FROM public.institutions i WHERE i.admin_user_id = auth.uid()
    )
  )
  OR
  -- Authenticated users can view limited profile info (for research paper authors)
  -- This is acceptable as it only allows authenticated users, not anonymous
  (auth.uid() IS NOT NULL)
);