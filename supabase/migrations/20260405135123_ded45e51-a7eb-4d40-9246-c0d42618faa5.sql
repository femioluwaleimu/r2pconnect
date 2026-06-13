
-- Add paid application columns to job_postings
ALTER TABLE public.job_postings
ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS application_fee_ngn numeric NOT NULL DEFAULT 0;

-- Create industry_job_payments table for tracking paid applications
CREATE TABLE public.industry_job_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.job_applications(id) ON DELETE SET NULL,
  amount_ngn numeric NOT NULL DEFAULT 0,
  industry_share_ngn numeric NOT NULL DEFAULT 0,
  platform_share_ngn numeric NOT NULL DEFAULT 0,
  paystack_reference text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_job_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
ON public.industry_job_payments FOR SELECT TO authenticated
USING (auth.uid() = applicant_id);

CREATE POLICY "Users can insert own payments"
ON public.industry_job_payments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Admins can view all payments"
ON public.industry_job_payments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Industry can view their job payments"
ON public.industry_job_payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.job_postings jp
    WHERE jp.id = industry_job_payments.job_id
    AND jp.industry_id = auth.uid()
  )
);
