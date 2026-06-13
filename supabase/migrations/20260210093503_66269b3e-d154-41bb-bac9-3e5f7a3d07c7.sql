-- Allow supervisors to view profiles of students whose research they supervise
CREATE POLICY "Supervisors can view their students profiles"
  ON public.profiles FOR SELECT
  USING (
    user_id IN (
      SELECT author_id FROM public.research_papers
      WHERE supervisor_id = auth.uid()
        AND research_type = 'student'
    )
  );