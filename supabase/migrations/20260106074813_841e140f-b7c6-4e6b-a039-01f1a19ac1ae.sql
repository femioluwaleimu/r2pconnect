-- Create researcher_subscriptions table for following researchers
CREATE TABLE public.researcher_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  researcher_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, researcher_id)
);

-- Enable RLS
ALTER TABLE public.researcher_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own subscriptions"
ON public.researcher_subscriptions
FOR SELECT
USING (auth.uid() = follower_id);

CREATE POLICY "Users can subscribe to researchers"
ON public.researcher_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unsubscribe"
ON public.researcher_subscriptions
FOR DELETE
USING (auth.uid() = follower_id);

CREATE POLICY "Researchers can view their followers"
ON public.researcher_subscriptions
FOR SELECT
USING (auth.uid() = researcher_id);