
-- Supervisor style references for students
CREATE TABLE IF NOT EXISTS public.supervisor_style_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL,
  student_id uuid NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  source_description text,
  declaration_accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_style_references ENABLE ROW LEVEL SECURITY;

-- Supervisors can manage references they created
CREATE POLICY "Supervisors can insert own style refs"
  ON public.supervisor_style_references FOR INSERT
  WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Supervisors can view own style refs"
  ON public.supervisor_style_references FOR SELECT
  USING (auth.uid() = supervisor_id);

CREATE POLICY "Supervisors can delete own style refs"
  ON public.supervisor_style_references FOR DELETE
  USING (auth.uid() = supervisor_id);

-- Students can view references added for them
CREATE POLICY "Students can view their style refs"
  ON public.supervisor_style_references FOR SELECT
  USING (auth.uid() = student_id);

-- Admins can manage all
CREATE POLICY "Admins can manage all supervisor style refs"
  ON public.supervisor_style_references FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add download_credit_cost to institutions (institution-level setting)
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS download_credit_cost integer NOT NULL DEFAULT 0;
