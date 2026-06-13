-- Allow paper authors to view reviews of their own papers
CREATE POLICY "Authors can view reviews of their papers" 
ON public.paper_reviews 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT author_id FROM public.research_papers WHERE id = paper_id
  )
);