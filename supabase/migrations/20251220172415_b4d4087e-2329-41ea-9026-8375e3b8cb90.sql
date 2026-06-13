-- Create challenge_matches table to store AI-generated researcher matches
CREATE TABLE public.challenge_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  researcher_id UUID NOT NULL,
  paper_id UUID NOT NULL REFERENCES public.research_papers(id) ON DELETE CASCADE,
  relevance_score INTEGER NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 100),
  match_reason TEXT,
  is_contacted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, paper_id)
);

-- Enable RLS
ALTER TABLE public.challenge_matches ENABLE ROW LEVEL SECURITY;

-- Industry users can view matches for their challenges
CREATE POLICY "Industry can view own challenge matches"
ON public.challenge_matches
FOR SELECT
TO authenticated
USING (
  challenge_id IN (
    SELECT id FROM public.challenges WHERE industry_id = auth.uid()
  )
);

-- Industry users can update matches (e.g., mark as contacted)
CREATE POLICY "Industry can update own challenge matches"
ON public.challenge_matches
FOR UPDATE
TO authenticated
USING (
  challenge_id IN (
    SELECT id FROM public.challenges WHERE industry_id = auth.uid()
  )
);

-- System can insert matches (via service role in edge function)
CREATE POLICY "Service role can insert matches"
ON public.challenge_matches
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add subscription benefits columns
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS max_challenges_per_month INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS ai_matches_per_challenge INTEGER DEFAULT 3;

-- Update default limits based on tier using a function
CREATE OR REPLACE FUNCTION public.get_subscription_limits(tier_name subscription_tier)
RETURNS TABLE(max_challenges INTEGER, ai_matches INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    CASE tier_name
      WHEN 'free' THEN 1
      WHEN 'basic' THEN 5
      WHEN 'pro' THEN 20
      WHEN 'enterprise' THEN 999
    END as max_challenges,
    CASE tier_name
      WHEN 'free' THEN 3
      WHEN 'basic' THEN 10
      WHEN 'pro' THEN 25
      WHEN 'enterprise' THEN 100
    END as ai_matches
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_challenge_matches_updated_at
BEFORE UPDATE ON public.challenge_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();