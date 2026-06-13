
-- Add allow_download option for research papers
ALTER TABLE public.research_papers ADD COLUMN IF NOT EXISTS allow_download boolean DEFAULT true;

-- Add journal publication fields
ALTER TABLE public.research_papers ADD COLUMN IF NOT EXISTS is_published_journal boolean DEFAULT false;
ALTER TABLE public.research_papers ADD COLUMN IF NOT EXISTS journal_name text;
ALTER TABLE public.research_papers ADD COLUMN IF NOT EXISTS journal_url text;

-- Add patent fields
ALTER TABLE public.research_papers ADD COLUMN IF NOT EXISTS is_patented boolean DEFAULT false;
ALTER TABLE public.research_papers ADD COLUMN IF NOT EXISTS patent_number text;
