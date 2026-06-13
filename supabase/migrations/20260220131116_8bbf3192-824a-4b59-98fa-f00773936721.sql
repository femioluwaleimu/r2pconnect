
-- Add author_names column to research_papers
ALTER TABLE public.research_papers ADD COLUMN author_names text[] DEFAULT NULL;
