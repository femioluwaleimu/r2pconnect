
-- Add supervision_mode column to research_papers
ALTER TABLE public.research_papers 
ADD COLUMN IF NOT EXISTS supervision_mode text DEFAULT 'human_only' 
CHECK (supervision_mode IN ('ai_only', 'human_only', 'hybrid_ai_human'));

-- Update existing records based on supervision_type
UPDATE public.research_papers 
SET supervision_mode = CASE 
  WHEN supervision_type = 'ai' THEN 'ai_only'
  WHEN supervision_type = 'institution' THEN 'human_only'
  ELSE 'human_only'
END
WHERE supervision_mode IS NULL OR supervision_mode = 'human_only';
