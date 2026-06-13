-- Drop the existing constraint and add new one with 'ai_supervised' value
ALTER TABLE public.research_papers 
DROP CONSTRAINT IF EXISTS research_papers_supervisor_approval_status_check;

ALTER TABLE public.research_papers 
ADD CONSTRAINT research_papers_supervisor_approval_status_check 
CHECK (supervisor_approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'revision_requested'::text, 'rejected'::text, 'ai_supervised'::text]));