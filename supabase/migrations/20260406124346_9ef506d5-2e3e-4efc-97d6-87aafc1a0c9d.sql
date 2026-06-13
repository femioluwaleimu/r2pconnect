
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS work_mode text;
ALTER TABLE public.ipn_opportunities ADD COLUMN IF NOT EXISTS work_mode text;
