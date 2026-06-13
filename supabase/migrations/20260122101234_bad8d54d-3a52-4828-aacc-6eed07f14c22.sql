-- Add parsed location fields to job_postings
ALTER TABLE public.job_postings
ADD COLUMN IF NOT EXISTS company_city text,
ADD COLUMN IF NOT EXISTS company_region text;

-- Backfill best-effort from existing company_location (expects "City, Region" or "City")
UPDATE public.job_postings
SET
  company_city = COALESCE(company_city, NULLIF(btrim(split_part(company_location, ',', 1)), '')),
  company_region = COALESCE(company_region, NULLIF(btrim(split_part(company_location, ',', 2)), ''))
WHERE company_location IS NOT NULL
  AND (company_city IS NULL OR company_region IS NULL);

CREATE INDEX IF NOT EXISTS idx_job_postings_company_city ON public.job_postings(company_city);
CREATE INDEX IF NOT EXISTS idx_job_postings_company_region ON public.job_postings(company_region);