-- Add new metadata fields to research_papers table
ALTER TABLE public.research_papers 
ADD COLUMN IF NOT EXISTS research_field TEXT,
ADD COLUMN IF NOT EXISTS research_stage TEXT DEFAULT 'concept',
ADD COLUMN IF NOT EXISTS funding_status TEXT DEFAULT 'unfunded',
ADD COLUMN IF NOT EXISTS funding_required NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS funding_currency TEXT DEFAULT 'NGN';

-- Add comments for documentation
COMMENT ON COLUMN public.research_papers.research_field IS 'Field of research (e.g., Engineering, Medicine, etc.)';
COMMENT ON COLUMN public.research_papers.research_stage IS 'Stage of research: concept, proposal, ongoing, completed';
COMMENT ON COLUMN public.research_papers.funding_status IS 'Funding status: unfunded, seeking_funding, funded';
COMMENT ON COLUMN public.research_papers.funding_required IS 'Amount of funding required if seeking_funding';
COMMENT ON COLUMN public.research_papers.funding_currency IS 'Currency for funding amount';