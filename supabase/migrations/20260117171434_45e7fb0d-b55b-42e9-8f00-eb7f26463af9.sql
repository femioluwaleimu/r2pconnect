-- Fix supervisor_invites RLS policy to use a security definer function instead of accessing auth.users directly

-- Create a security definer function to get the current user's email
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id
$$;

-- Drop the problematic policy if it exists
DROP POLICY IF EXISTS "Invited users can accept their supervisor invite" ON supervisor_invites;

-- Create a new policy using the security definer function
CREATE POLICY "Invited users can accept their supervisor invite" 
ON supervisor_invites 
FOR UPDATE 
TO authenticated
USING (email = public.get_user_email(auth.uid()))
WITH CHECK (status = 'accepted');

-- Also fix reviewer_invites if needed
DROP POLICY IF EXISTS "Invited users can accept their reviewer invite" ON reviewer_invites;

CREATE POLICY "Invited users can accept their reviewer invite" 
ON reviewer_invites 
FOR UPDATE 
TO authenticated
USING (email = public.get_user_email(auth.uid()))
WITH CHECK (status = 'accepted');