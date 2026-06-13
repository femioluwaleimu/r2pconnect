-- Create table for storing AI chapter review results
CREATE TABLE public.research_chapter_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  research_id UUID NOT NULL REFERENCES public.research_papers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  chapter_name TEXT NOT NULL,
  chapter_number INTEGER,
  rating NUMERIC(3,1) CHECK (rating >= 1 AND rating <= 5),
  academic_clarity_score NUMERIC(3,1) CHECK (academic_clarity_score >= 1 AND academic_clarity_score <= 5),
  methodology_alignment NUMERIC(3,1) CHECK (methodology_alignment >= 1 AND methodology_alignment <= 5),
  strengths TEXT[],
  weak_areas TEXT[],
  recommendations TEXT[],
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(research_id, chapter_name)
);

-- Create indexes for performance
CREATE INDEX idx_chapter_reviews_research ON public.research_chapter_reviews(research_id);
CREATE INDEX idx_chapter_reviews_user ON public.research_chapter_reviews(user_id);

-- Enable RLS
ALTER TABLE public.research_chapter_reviews ENABLE ROW LEVEL SECURITY;

-- Students can view and create reviews for their own research
CREATE POLICY "Students can view own chapter reviews"
ON public.research_chapter_reviews
FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM research_papers rp 
    WHERE rp.id = research_id AND rp.author_id = auth.uid()
  )
);

CREATE POLICY "Students can create chapter reviews for own research"
ON public.research_chapter_reviews
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM research_papers rp 
    WHERE rp.id = research_id AND rp.author_id = auth.uid()
  )
);

CREATE POLICY "Students can delete own chapter reviews"
ON public.research_chapter_reviews
FOR DELETE
USING (user_id = auth.uid());

-- Supervisors can view chapter reviews for their supervised research
CREATE POLICY "Supervisors can view supervised research chapter reviews"
ON public.research_chapter_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM research_papers rp 
    WHERE rp.id = research_id AND (rp.supervisor_id = auth.uid() OR rp.co_supervisor_id = auth.uid())
  )
);

-- Admins and institution users can view all chapter reviews
CREATE POLICY "Admins can view all chapter reviews"
ON public.research_chapter_reviews
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_chapter_reviews_updated_at
BEFORE UPDATE ON public.research_chapter_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();