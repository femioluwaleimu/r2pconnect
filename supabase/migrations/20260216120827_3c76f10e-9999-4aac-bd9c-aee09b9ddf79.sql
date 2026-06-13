
-- Add department_id to research_papers
ALTER TABLE public.research_papers
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Add department_id to supervisors
ALTER TABLE public.supervisors
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_research_papers_department_id ON public.research_papers(department_id);
CREATE INDEX idx_supervisors_department_id ON public.supervisors(department_id);
