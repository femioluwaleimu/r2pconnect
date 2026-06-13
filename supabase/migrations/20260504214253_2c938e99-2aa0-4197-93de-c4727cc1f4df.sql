
CREATE TABLE public.supervisor_ai_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tone TEXT NOT NULL DEFAULT 'supportive' CHECK (tone IN ('supportive','direct','strict','formal','conversational')),
  strictness TEXT NOT NULL DEFAULT 'balanced' CHECK (strictness IN ('lenient','balanced','strict','very_strict')),
  citation_style TEXT DEFAULT 'apa' CHECK (citation_style IN ('apa','mla','harvard','ieee','chicago','other')),
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  do_rules TEXT[] NOT NULL DEFAULT '{}',
  dont_rules TEXT[] NOT NULL DEFAULT '{}',
  custom_guidance TEXT,
  example_feedback TEXT,
  research_field TEXT,
  preferred_methodology TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supervisor_ai_training_supervisor ON public.supervisor_ai_training(supervisor_id);

ALTER TABLE public.supervisor_ai_training ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors view own training"
ON public.supervisor_ai_training FOR SELECT
USING (supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors insert own training"
ON public.supervisor_ai_training FOR INSERT
WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "Supervisors update own training"
ON public.supervisor_ai_training FOR UPDATE
USING (supervisor_id = auth.uid());

CREATE POLICY "Supervisors delete own training"
ON public.supervisor_ai_training FOR DELETE
USING (supervisor_id = auth.uid());

CREATE TRIGGER trg_supervisor_ai_training_updated_at
BEFORE UPDATE ON public.supervisor_ai_training
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
