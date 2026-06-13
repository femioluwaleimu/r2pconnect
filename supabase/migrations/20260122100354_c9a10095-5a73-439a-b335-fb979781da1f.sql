-- Add company snapshot fields to job postings
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS company_location TEXT;

-- Add student snapshot fields to job applications
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_level TEXT,
  ADD COLUMN IF NOT EXISTS student_institution_id UUID,
  ADD COLUMN IF NOT EXISTS student_institution_name TEXT,
  ADD COLUMN IF NOT EXISTS student_avatar_url TEXT;

-- Add researcher snapshot fields to researcher invites
ALTER TABLE public.researcher_invites
  ADD COLUMN IF NOT EXISTS researcher_name TEXT,
  ADD COLUMN IF NOT EXISTS researcher_institution_id UUID,
  ADD COLUMN IF NOT EXISTS researcher_institution_name TEXT;