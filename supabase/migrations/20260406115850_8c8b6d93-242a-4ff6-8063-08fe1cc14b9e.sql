
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS employer_feedback text;
ALTER TABLE public.ipn_applications ADD COLUMN IF NOT EXISTS employer_feedback text;
