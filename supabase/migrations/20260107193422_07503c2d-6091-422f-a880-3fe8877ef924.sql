-- Add year_completed to research_papers
ALTER TABLE public.research_papers
ADD COLUMN IF NOT EXISTS year_completed INTEGER;

-- Add research_type field to research_papers (student | completed)
ALTER TABLE public.research_papers
ADD COLUMN IF NOT EXISTS research_type TEXT DEFAULT 'completed' CHECK (research_type IN ('student', 'completed'));

-- Add supervisor fields to research_papers
ALTER TABLE public.research_papers
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS co_supervisor_id UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS supervisor_approval_status TEXT DEFAULT 'pending' CHECK (supervisor_approval_status IN ('pending', 'approved', 'revision_requested', 'rejected')),
ADD COLUMN IF NOT EXISTS supervisor_comments TEXT,
ADD COLUMN IF NOT EXISTS supervisor_approved_at TIMESTAMPTZ;

-- Create supervisors table for institution-approved supervisors
CREATE TABLE IF NOT EXISTS public.supervisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  department TEXT,
  specialization TEXT[],
  max_students INTEGER DEFAULT 10,
  current_students INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on supervisors
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;

-- RLS policies for supervisors
CREATE POLICY "Supervisors viewable by authenticated users"
ON public.supervisors FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Institution admins can manage supervisors"
ON public.supervisors FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.institutions
    WHERE id = supervisors.institution_id
    AND admin_user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can update own record"
ON public.supervisors FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create supervisor invites table
CREATE TABLE IF NOT EXISTS public.supervisor_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ
);

-- Enable RLS on supervisor_invites
ALTER TABLE public.supervisor_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for supervisor_invites
CREATE POLICY "Anyone can view invite by code"
ON public.supervisor_invites FOR SELECT
USING (true);

CREATE POLICY "Institution admins can manage invites"
ON public.supervisor_invites FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.institutions
    WHERE id = supervisor_invites.institution_id
    AND admin_user_id = auth.uid()
  )
);

-- Add supervisor role to app_role enum if not exists
DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create trigger for updated_at on supervisors
CREATE TRIGGER update_supervisors_updated_at
BEFORE UPDATE ON public.supervisors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();