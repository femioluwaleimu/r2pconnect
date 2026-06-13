-- Add supervision_type and AI style source to research_papers
ALTER TABLE public.research_papers 
ADD COLUMN IF NOT EXISTS supervision_type text DEFAULT 'institution' CHECK (supervision_type IN ('institution', 'ai')),
ADD COLUMN IF NOT EXISTS ai_style_source text DEFAULT 'institution' CHECK (ai_style_source IN ('institution', 'student'));

-- Create table for student style reference uploads (metadata only)
CREATE TABLE public.student_style_references (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  source_description text,
  declaration_accepted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_style_references ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_style_references
CREATE POLICY "Students can view own style references" 
ON public.student_style_references 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own style references" 
ON public.student_style_references 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can delete own style references" 
ON public.student_style_references 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add enhanced fields to research_chapter_reviews
ALTER TABLE public.research_chapter_reviews
ADD COLUMN IF NOT EXISTS review_mode text DEFAULT 'quick' CHECK (review_mode IN ('quick', 'learning')),
ADD COLUMN IF NOT EXISTS style_match_score numeric,
ADD COLUMN IF NOT EXISTS examiner_readiness text DEFAULT 'not_ready' CHECK (examiner_readiness IN ('not_ready', 'needs_revision', 'supervisor_ready')),
ADD COLUMN IF NOT EXISTS revision_checklist jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS required_fixes text[],
ADD COLUMN IF NOT EXISTS optional_improvements text[],
ADD COLUMN IF NOT EXISTS what_to_change text[],
ADD COLUMN IF NOT EXISTS why_it_matters text[],
ADD COLUMN IF NOT EXISTS examiner_expectations text[],
ADD COLUMN IF NOT EXISTS generic_examples text[];

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_style_references_user ON public.student_style_references(user_id);
CREATE INDEX IF NOT EXISTS idx_research_supervision_type ON public.research_papers(supervision_type) WHERE research_type = 'student';

-- Add RLS policy for students to update their own style references
CREATE POLICY "Students can update own style references" 
ON public.student_style_references 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);