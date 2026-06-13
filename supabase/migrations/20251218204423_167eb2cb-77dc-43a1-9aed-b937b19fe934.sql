-- Fix profiles RLS policy to prevent exposure of user contact information
-- Remove the overly permissive '(auth.uid() IS NOT NULL)' condition

DROP POLICY IF EXISTS "Users can view profiles with restrictions" ON public.profiles;

-- Create a more restrictive policy that only allows:
-- 1. Users to view their own profile
-- 2. Users in the same institution to view each other's basic profile
-- 3. Institution admins to view profiles of their researchers
CREATE POLICY "Users can view profiles with restrictions" 
ON public.profiles FOR SELECT USING (
  -- Users can always view their own profile
  auth.uid() = user_id
  OR
  -- Users in the same institution can view each other
  (institution_id IS NOT NULL AND institution_id IN (
    SELECT p.institution_id FROM profiles p WHERE p.user_id = auth.uid()
  ))
  OR
  -- Institution admins can view profiles of their institution members
  (institution_id IN (
    SELECT i.id FROM institutions i WHERE i.admin_user_id = auth.uid()
  ))
  OR
  -- Admins can view all profiles
  has_role(auth.uid(), 'admin')
);