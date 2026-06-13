-- Add integrity check fields to research_papers table (Student Research Only)
ALTER TABLE public.research_papers 
ADD COLUMN IF NOT EXISTS plagiarism_score numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS plagiarism_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS plagiarism_checked_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_usage_declared boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_tools_used text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_content_risk text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS supervisor_reviewed_at timestamp with time zone DEFAULT NULL;

-- Add check constraints for valid status values
ALTER TABLE public.research_papers 
ADD CONSTRAINT valid_plagiarism_status CHECK (plagiarism_status IS NULL OR plagiarism_status IN ('low', 'medium', 'high'));

ALTER TABLE public.research_papers 
ADD CONSTRAINT valid_ai_content_risk CHECK (ai_content_risk IS NULL OR ai_content_risk IN ('low', 'medium', 'high'));

-- Create index for faster queries on student research integrity checks
CREATE INDEX IF NOT EXISTS idx_research_papers_integrity ON public.research_papers (research_type, plagiarism_status, ai_content_risk) 
WHERE research_type = 'student_research';