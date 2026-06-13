-- Add plagiarism threshold settings to institutions table
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS plagiarism_threshold integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS ai_content_threshold text DEFAULT 'medium';

-- Add check constraint for valid threshold values
ALTER TABLE public.institutions 
ADD CONSTRAINT valid_plagiarism_threshold CHECK (plagiarism_threshold >= 0 AND plagiarism_threshold <= 100);

ALTER TABLE public.institutions 
ADD CONSTRAINT valid_ai_content_threshold CHECK (ai_content_threshold IS NULL OR ai_content_threshold IN ('low', 'medium', 'high'));

-- Add resubmission tracking to research_papers
ALTER TABLE public.research_papers
ADD COLUMN IF NOT EXISTS resubmission_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_resubmitted_at timestamp with time zone DEFAULT NULL;