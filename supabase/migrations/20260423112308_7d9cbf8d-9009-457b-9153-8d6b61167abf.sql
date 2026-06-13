ALTER TABLE public.research_papers
  ADD COLUMN IF NOT EXISTS research_level TEXT,
  ADD COLUMN IF NOT EXISTS research_purpose TEXT;