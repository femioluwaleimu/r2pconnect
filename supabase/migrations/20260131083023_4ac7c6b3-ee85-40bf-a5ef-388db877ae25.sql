-- Add policy for institution admins to view research papers from their institution
CREATE POLICY "Institution admins can view papers from their institution"
ON public.research_papers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institutions
    WHERE institutions.id = research_papers.institution_id
    AND institutions.admin_user_id = auth.uid()
  )
);

-- Also add UPDATE policy for institution admins to manage papers
CREATE POLICY "Institution admins can update papers from their institution"
ON public.research_papers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.institutions
    WHERE institutions.id = research_papers.institution_id
    AND institutions.admin_user_id = auth.uid()
  )
);