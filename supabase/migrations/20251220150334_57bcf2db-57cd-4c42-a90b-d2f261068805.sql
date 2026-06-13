-- Create challenge_submissions table for tracking researcher responses
CREATE TABLE public.challenge_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  researcher_id UUID NOT NULL,
  proposal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

-- Researchers can submit to active challenges
CREATE POLICY "Researchers can insert submissions" 
ON public.challenge_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = researcher_id);

-- Researchers can view their own submissions
CREATE POLICY "Researchers can view own submissions" 
ON public.challenge_submissions 
FOR SELECT 
USING (auth.uid() = researcher_id);

-- Industry users can view submissions to their challenges
CREATE POLICY "Industry can view challenge submissions" 
ON public.challenge_submissions 
FOR SELECT 
USING (challenge_id IN (SELECT id FROM public.challenges WHERE industry_id = auth.uid()));

-- Industry users can update submission status
CREATE POLICY "Industry can update submission status" 
ON public.challenge_submissions 
FOR UPDATE 
USING (challenge_id IN (SELECT id FROM public.challenges WHERE industry_id = auth.uid()));

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions" 
ON public.challenge_submissions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_challenge_submissions_updated_at
BEFORE UPDATE ON public.challenge_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();