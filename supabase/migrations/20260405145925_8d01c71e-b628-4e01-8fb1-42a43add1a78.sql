
-- Add requires_cv to job_postings
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS requires_cv boolean NOT NULL DEFAULT false;

-- Add requires_cv to ipn_opportunities
ALTER TABLE public.ipn_opportunities ADD COLUMN IF NOT EXISTS requires_cv boolean NOT NULL DEFAULT false;

-- Add cv_url to job_applications
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS cv_url text;

-- Add cv_url to ipn_applications
ALTER TABLE public.ipn_applications ADD COLUMN IF NOT EXISTS cv_url text;

-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('job-cvs', 'job-cvs', false) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload CVs to their own folder
CREATE POLICY "Users can upload their own CVs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their own CVs
CREATE POLICY "Users can view their own CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'job-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow industry users to view CVs (they need to see applicant CVs)
CREATE POLICY "Industry can view all CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'job-cvs' AND (
  public.has_role(auth.uid(), 'industry') OR 
  public.has_role(auth.uid(), 'ipn') OR
  public.has_role(auth.uid(), 'admin')
));
