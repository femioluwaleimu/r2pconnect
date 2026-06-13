-- Drop existing conflicting policies on supervisor_invites
DROP POLICY IF EXISTS "Invited users can accept their supervisor invite" ON supervisor_invites;
DROP POLICY IF EXISTS "Users can accept their own supervisor invites" ON supervisor_invites;

-- Create a more permissive policy that allows newly registered users to update their invite
-- This policy allows any authenticated user to update their own invite based on email match
CREATE POLICY "Invited users can accept their supervisor invite" 
ON supervisor_invites 
FOR UPDATE 
USING (
  email = public.get_user_email(auth.uid())
)
WITH CHECK (
  status = 'accepted'
);

-- Also ensure institution admins can delete (not just update to cancelled)
DROP POLICY IF EXISTS "Institution admins can delete invites" ON supervisor_invites;
CREATE POLICY "Institution admins can delete invites" 
ON supervisor_invites 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM institutions 
    WHERE institutions.id = supervisor_invites.institution_id 
    AND institutions.admin_user_id = auth.uid()
  )
);

-- Same for reviewer_invites - ensure delete works
DROP POLICY IF EXISTS "Institution admins can delete reviewer invites" ON reviewer_invites;
CREATE POLICY "Institution admins can delete reviewer invites" 
ON reviewer_invites 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM institutions 
    WHERE institutions.id = reviewer_invites.institution_id 
    AND institutions.admin_user_id = auth.uid()
  )
);