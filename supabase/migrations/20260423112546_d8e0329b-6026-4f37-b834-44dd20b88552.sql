ALTER TABLE public.research_chapter_reviews
  ADD COLUMN IF NOT EXISTS academic_level_feedback TEXT[],
  ADD COLUMN IF NOT EXISTS purpose_based_recommendations TEXT[];