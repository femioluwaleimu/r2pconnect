-- Allow institution admins to view paper reviews within their institution
CREATE POLICY "Institution admins can view institution paper reviews" 
ON public.paper_reviews 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT i.admin_user_id 
    FROM public.institutions i
    JOIN public.research_papers rp ON rp.institution_id = i.id
    WHERE rp.id = paper_id
  )
);

-- Add phone_number column to profiles
ALTER TABLE public.profiles ADD COLUMN phone_number text;