-- Fix: Allow new supervisors to insert themselves during registration
-- The supervisor record is created during registration by the user themselves

-- Add policy for new supervisors to insert their own record during registration
CREATE POLICY "Users can create their own supervisor record"
ON public.supervisors
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- For reviewer_invites, update the cancel functionality to use UPDATE with 'cancelled' status
-- The existing policies already support this, but let's add explicit UPDATE for status change
DROP POLICY IF EXISTS "Invited users can accept their reviewer invite" ON public.reviewer_invites;
DROP POLICY IF EXISTS "Users can accept their own reviewer invites" ON public.reviewer_invites;

-- Create a combined policy for invited users to update their own invite
CREATE POLICY "Invited users can update their own reviewer invite"
ON public.reviewer_invites
FOR UPDATE
TO authenticated
USING (email = public.get_user_email(auth.uid()))
WITH CHECK (status IN ('accepted', 'cancelled'));