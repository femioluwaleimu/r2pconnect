
-- Comments on AI chapter reviews, visible to student (author) and assigned supervisors
CREATE TABLE public.chapter_review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.research_chapter_reviews(id) ON DELETE CASCADE,
  research_id UUID NOT NULL REFERENCES public.research_papers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('student','supervisor','admin')),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chapter_review_comments_review ON public.chapter_review_comments(review_id);
CREATE INDEX idx_chapter_review_comments_research ON public.chapter_review_comments(research_id);

ALTER TABLE public.chapter_review_comments ENABLE ROW LEVEL SECURITY;

-- View: student (author), supervisors of the research, admins
CREATE POLICY "Participants can view chapter review comments"
ON public.chapter_review_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.research_papers rp
    WHERE rp.id = chapter_review_comments.research_id
      AND (rp.author_id = auth.uid() OR rp.supervisor_id = auth.uid() OR rp.co_supervisor_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Insert: must be a participant and posting as themselves
CREATE POLICY "Participants can post chapter review comments"
ON public.chapter_review_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.research_papers rp
    WHERE rp.id = chapter_review_comments.research_id
      AND (rp.author_id = auth.uid() OR rp.supervisor_id = auth.uid() OR rp.co_supervisor_id = auth.uid())
  )
);

-- Update / delete own comments
CREATE POLICY "Users can update own chapter review comments"
ON public.chapter_review_comments FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own chapter review comments"
ON public.chapter_review_comments FOR DELETE
USING (user_id = auth.uid());

CREATE TRIGGER trg_chapter_review_comments_updated_at
BEFORE UPDATE ON public.chapter_review_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
