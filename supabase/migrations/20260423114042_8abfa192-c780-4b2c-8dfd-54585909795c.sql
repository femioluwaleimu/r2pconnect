
-- Allow 'advanced' as a valid review_mode
ALTER TABLE public.research_chapter_reviews
  DROP CONSTRAINT IF EXISTS research_chapter_reviews_review_mode_check;

ALTER TABLE public.research_chapter_reviews
  ADD CONSTRAINT research_chapter_reviews_review_mode_check
  CHECK (review_mode = ANY (ARRAY['quick'::text, 'learning'::text, 'advanced'::text]));

-- Add advanced-mode structured fields
ALTER TABLE public.research_chapter_reviews
  ADD COLUMN IF NOT EXISTS suggested_improvements text[],
  ADD COLUMN IF NOT EXISTS structure_review text,
  ADD COLUMN IF NOT EXISTS methodology_assessment text,
  ADD COLUMN IF NOT EXISTS literature_review_quality text,
  ADD COLUMN IF NOT EXISTS clarity_readability text,
  ADD COLUMN IF NOT EXISTS academic_language_tone text,
  ADD COLUMN IF NOT EXISTS referencing_check text,
  ADD COLUMN IF NOT EXISTS originality_critical_thinking text,
  ADD COLUMN IF NOT EXISTS practical_relevance text,
  ADD COLUMN IF NOT EXISTS risk_gap_identification text[],
  ADD COLUMN IF NOT EXISTS ai_confidence_score integer,
  ADD COLUMN IF NOT EXISTS ai_confidence_explanation text,
  ADD COLUMN IF NOT EXISTS priority_fix_list text[],
  ADD COLUMN IF NOT EXISTS next_action_steps text[],
  ADD COLUMN IF NOT EXISTS supervisor_insight text,
  ADD COLUMN IF NOT EXISTS encouragement_note text;
