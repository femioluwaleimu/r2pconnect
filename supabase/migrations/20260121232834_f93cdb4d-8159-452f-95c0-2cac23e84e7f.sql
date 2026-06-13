-- Create table for supervisor feedback uploads and review history
CREATE TABLE public.supervisor_feedback_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  research_id UUID NOT NULL REFERENCES public.research_papers(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'annotated',
  version_number INTEGER NOT NULL DEFAULT 1,
  review_stage TEXT NOT NULL,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for supervisor review history with timestamps
CREATE TABLE public.supervisor_review_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  research_id UUID NOT NULL REFERENCES public.research_papers(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  comments TEXT,
  feedback_file_id UUID REFERENCES public.supervisor_feedback_uploads(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.supervisor_feedback_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_review_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supervisor_feedback_uploads

-- Supervisors can insert feedback files for their assigned research
CREATE POLICY "Supervisors can insert feedback files"
ON public.supervisor_feedback_uploads
FOR INSERT
WITH CHECK (
  auth.uid() = supervisor_id AND
  EXISTS (
    SELECT 1 FROM public.research_papers rp
    WHERE rp.id = research_id
    AND (rp.supervisor_id = auth.uid() OR rp.co_supervisor_id = auth.uid())
    AND rp.supervisor_approval_status IN ('pending', 'revision_requested')
  )
);

-- Supervisors can view their uploaded feedback files
CREATE POLICY "Supervisors can view own feedback files"
ON public.supervisor_feedback_uploads
FOR SELECT
USING (auth.uid() = supervisor_id);

-- Students (authors) can view feedback files for their research
CREATE POLICY "Students can view feedback files for their research"
ON public.supervisor_feedback_uploads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.research_papers rp
    WHERE rp.id = research_id AND rp.author_id = auth.uid()
  )
);

-- Admins can view all feedback files
CREATE POLICY "Admins can view all feedback files"
ON public.supervisor_feedback_uploads
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for supervisor_review_history

-- Supervisors can insert review history for their assigned research
CREATE POLICY "Supervisors can insert review history"
ON public.supervisor_review_history
FOR INSERT
WITH CHECK (
  auth.uid() = supervisor_id AND
  EXISTS (
    SELECT 1 FROM public.research_papers rp
    WHERE rp.id = research_id
    AND (rp.supervisor_id = auth.uid() OR rp.co_supervisor_id = auth.uid())
  )
);

-- Supervisors can view their review history
CREATE POLICY "Supervisors can view own review history"
ON public.supervisor_review_history
FOR SELECT
USING (auth.uid() = supervisor_id);

-- Students can view review history for their research
CREATE POLICY "Students can view review history for their research"
ON public.supervisor_review_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.research_papers rp
    WHERE rp.id = research_id AND rp.author_id = auth.uid()
  )
);

-- Admins can view all review history
CREATE POLICY "Admins can view all review history"
ON public.supervisor_review_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_supervisor_feedback_research ON public.supervisor_feedback_uploads(research_id);
CREATE INDEX idx_supervisor_feedback_supervisor ON public.supervisor_feedback_uploads(supervisor_id);
CREATE INDEX idx_supervisor_review_history_research ON public.supervisor_review_history(research_id);
CREATE INDEX idx_supervisor_review_history_supervisor ON public.supervisor_review_history(supervisor_id);
CREATE INDEX idx_supervisor_review_history_created ON public.supervisor_review_history(created_at DESC);