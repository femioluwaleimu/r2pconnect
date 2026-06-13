-- Allow institution admins to update profiles of students in their institution
CREATE POLICY "Institution admins can update institution profiles"
ON public.profiles
FOR UPDATE
USING (
  institution_id IN (
    SELECT id FROM institutions WHERE admin_user_id = auth.uid()
  )
);