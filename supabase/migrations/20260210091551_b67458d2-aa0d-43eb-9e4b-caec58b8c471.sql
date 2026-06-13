-- Allow students to view profiles of their accepted external supervisor invites
CREATE POLICY "Students can view invited supervisor profiles"
  ON public.profiles
  FOR SELECT
  USING (
    email IN (
      SELECT email FROM public.external_supervisor_invites
      WHERE student_id = auth.uid()
      AND status = 'accepted'
    )
  );
