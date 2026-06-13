
-- Add is_external column to supervisors
ALTER TABLE public.supervisors ADD COLUMN IF NOT EXISTS is_external boolean DEFAULT false;

-- Make institution_id nullable for external supervisors
ALTER TABLE public.supervisors ALTER COLUMN institution_id DROP NOT NULL;

-- Allow invited users to update their own invite by email match
CREATE POLICY "Invited supervisors can accept their invite"
  ON public.external_supervisor_invites
  FOR UPDATE
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (status = 'accepted');
