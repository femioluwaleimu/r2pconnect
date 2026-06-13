
ALTER TABLE public.research_papers
  ADD COLUMN IF NOT EXISTS citation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sdg_category text,
  ADD COLUMN IF NOT EXISTS methodology text,
  ADD COLUMN IF NOT EXISTS key_findings text;

CREATE INDEX IF NOT EXISTS idx_research_papers_published_status
  ON public.research_papers (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_papers_keywords
  ON public.research_papers USING GIN (keywords);

CREATE TABLE IF NOT EXISTS public.saved_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  paper_id uuid NOT NULL REFERENCES public.research_papers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, paper_id)
);

ALTER TABLE public.saved_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved research"
  ON public.saved_research FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users save research"
  ON public.saved_research FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own saved research"
  ON public.saved_research FOR DELETE
  USING (auth.uid() = user_id);
