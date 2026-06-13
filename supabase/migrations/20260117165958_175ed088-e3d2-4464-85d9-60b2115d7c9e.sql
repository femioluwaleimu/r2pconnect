-- Fix CHECK constraints to include 'cancelled' status
ALTER TABLE supervisor_invites 
DROP CONSTRAINT IF EXISTS supervisor_invites_status_check;

ALTER TABLE supervisor_invites
ADD CONSTRAINT supervisor_invites_status_check 
CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'));

ALTER TABLE reviewer_invites 
DROP CONSTRAINT IF EXISTS reviewer_invites_status_check;

ALTER TABLE reviewer_invites
ADD CONSTRAINT reviewer_invites_status_check 
CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'));

-- Add RLS policy for supervisors to accept their own invites
CREATE POLICY "Users can accept their own supervisor invites" 
ON supervisor_invites FOR UPDATE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (status = 'accepted');

-- Add RLS policy for reviewers to accept their own invites
CREATE POLICY "Users can accept their own reviewer invites" 
ON reviewer_invites FOR UPDATE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (status = 'accepted');