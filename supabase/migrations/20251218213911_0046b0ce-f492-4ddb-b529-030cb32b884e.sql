-- Allow industry users to delete their own challenges
CREATE POLICY "Industry users can delete own challenges"
ON public.challenges
FOR DELETE
USING (auth.uid() = industry_id AND has_role(auth.uid(), 'industry'::app_role));