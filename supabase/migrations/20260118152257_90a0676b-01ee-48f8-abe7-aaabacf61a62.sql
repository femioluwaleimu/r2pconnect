-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Supervisors can delete own record" ON supervisors;

-- Add policy for supervisors to delete their own record
CREATE POLICY "Supervisors can delete own record" 
ON supervisors 
FOR DELETE 
USING (user_id = auth.uid());

-- Note: The existing policies already cover:
-- 1. Institution admins can manage supervisors (ALL - includes delete)
-- 2. Supervisors can update own record (UPDATE)
-- 3. Supervisors viewable by authenticated users (SELECT - allows students to list)