-- Create documentary_comments table for comments on documentaries
CREATE TABLE public.documentary_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documentary_id UUID NOT NULL REFERENCES public.documentaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documentary_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments
CREATE POLICY "Anyone can view documentary comments"
ON public.documentary_comments
FOR SELECT
USING (true);

-- Authenticated users can insert comments
CREATE POLICY "Authenticated users can insert comments"
ON public.documentary_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.documentary_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.documentary_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_documentary_comments_documentary_id ON public.documentary_comments(documentary_id);
CREATE INDEX idx_documentary_comments_user_id ON public.documentary_comments(user_id);