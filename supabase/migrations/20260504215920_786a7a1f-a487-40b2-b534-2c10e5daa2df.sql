
-- Presets table
CREATE TABLE public.supervisor_ai_training_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
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
CREATE INDEX idx_sup_ai_presets_supervisor ON public.supervisor_ai_training_presets(supervisor_id);
CREATE UNIQUE INDEX uniq_sup_ai_presets_name ON public.supervisor_ai_training_presets(supervisor_id, lower(name));

ALTER TABLE public.supervisor_ai_training_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sup view own presets" ON public.supervisor_ai_training_presets
  FOR SELECT USING (supervisor_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Sup insert own presets" ON public.supervisor_ai_training_presets
  FOR INSERT WITH CHECK (supervisor_id = auth.uid());
CREATE POLICY "Sup update own presets" ON public.supervisor_ai_training_presets
  FOR UPDATE USING (supervisor_id = auth.uid());
CREATE POLICY "Sup delete own presets" ON public.supervisor_ai_training_presets
  FOR DELETE USING (supervisor_id = auth.uid());

CREATE TRIGGER trg_sup_ai_presets_updated_at
  BEFORE UPDATE ON public.supervisor_ai_training_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assignments table (preset bound to a student or a specific research)
CREATE TABLE public.supervisor_training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL,
  preset_id UUID NOT NULL REFERENCES public.supervisor_ai_training_presets(id) ON DELETE CASCADE,
  student_id UUID,
  research_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_target_required CHECK (
    (student_id IS NOT NULL AND research_id IS NULL)
    OR (student_id IS NULL AND research_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX uniq_assign_student ON public.supervisor_training_assignments(supervisor_id, student_id) WHERE student_id IS NOT NULL;
CREATE UNIQUE INDEX uniq_assign_research ON public.supervisor_training_assignments(supervisor_id, research_id) WHERE research_id IS NOT NULL;
CREATE INDEX idx_assign_preset ON public.supervisor_training_assignments(preset_id);

ALTER TABLE public.supervisor_training_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sup view own assignments" ON public.supervisor_training_assignments
  FOR SELECT USING (supervisor_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Sup insert own assignments" ON public.supervisor_training_assignments
  FOR INSERT WITH CHECK (supervisor_id = auth.uid());
CREATE POLICY "Sup update own assignments" ON public.supervisor_training_assignments
  FOR UPDATE USING (supervisor_id = auth.uid());
CREATE POLICY "Sup delete own assignments" ON public.supervisor_training_assignments
  FOR DELETE USING (supervisor_id = auth.uid());

CREATE TRIGGER trg_sup_train_assignments_updated_at
  BEFORE UPDATE ON public.supervisor_training_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
