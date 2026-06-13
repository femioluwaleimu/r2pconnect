
CREATE TABLE public.job_feedback_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL,
  application_type TEXT NOT NULL DEFAULT 'direct',
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'employer',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_feedback_messages ENABLE ROW LEVEL SECURITY;

-- Applicants can view messages on their applications (direct)
CREATE POLICY "Applicants can view direct feedback"
ON public.job_feedback_messages FOR SELECT
USING (
  (application_type = 'direct' AND EXISTS (
    SELECT 1 FROM job_applications ja WHERE ja.id = application_id AND ja.student_id = auth.uid()
  ))
);

-- Applicants can view messages on their applications (ipn)
CREATE POLICY "Applicants can view ipn feedback"
ON public.job_feedback_messages FOR SELECT
USING (
  (application_type = 'ipn' AND EXISTS (
    SELECT 1 FROM ipn_applications ia WHERE ia.id = application_id AND ia.applicant_id = auth.uid()
  ))
);

-- Employers can view messages on their job applications (direct)
CREATE POLICY "Industry can view direct feedback"
ON public.job_feedback_messages FOR SELECT
USING (
  (application_type = 'direct' AND EXISTS (
    SELECT 1 FROM job_applications ja
    JOIN job_postings jp ON jp.id = ja.job_id
    WHERE ja.id = application_id AND jp.industry_id = auth.uid()
  ))
);

-- IPN users can view messages on their opportunity applications
CREATE POLICY "IPN can view ipn feedback"
ON public.job_feedback_messages FOR SELECT
USING (
  (application_type = 'ipn' AND EXISTS (
    SELECT 1 FROM ipn_applications ia
    JOIN ipn_opportunities io ON io.id = ia.opportunity_id
    WHERE ia.id = application_id AND io.ipn_user_id = auth.uid()
  ))
);

-- Applicants can send messages on their direct applications
CREATE POLICY "Applicants can send direct feedback"
ON public.job_feedback_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND sender_role = 'applicant' AND application_type = 'direct' AND EXISTS (
    SELECT 1 FROM job_applications ja WHERE ja.id = application_id AND ja.student_id = auth.uid()
  )
);

-- Applicants can send messages on their ipn applications
CREATE POLICY "Applicants can send ipn feedback"
ON public.job_feedback_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND sender_role = 'applicant' AND application_type = 'ipn' AND EXISTS (
    SELECT 1 FROM ipn_applications ia WHERE ia.id = application_id AND ia.applicant_id = auth.uid()
  )
);

-- Industry can send messages on their job applications
CREATE POLICY "Industry can send direct feedback"
ON public.job_feedback_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND sender_role = 'employer' AND application_type = 'direct' AND EXISTS (
    SELECT 1 FROM job_applications ja
    JOIN job_postings jp ON jp.id = ja.job_id
    WHERE ja.id = application_id AND jp.industry_id = auth.uid()
  )
);

-- IPN can send messages on their opportunity applications
CREATE POLICY "IPN can send ipn feedback"
ON public.job_feedback_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND sender_role = 'employer' AND application_type = 'ipn' AND EXISTS (
    SELECT 1 FROM ipn_applications ia
    JOIN ipn_opportunities io ON io.id = ia.opportunity_id
    WHERE ia.id = application_id AND io.ipn_user_id = auth.uid()
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all feedback"
ON public.job_feedback_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Mark as read
CREATE POLICY "Recipients can mark as read"
ON public.job_feedback_messages FOR UPDATE
USING (
  (application_type = 'direct' AND (
    EXISTS (SELECT 1 FROM job_applications ja WHERE ja.id = application_id AND ja.student_id = auth.uid())
    OR EXISTS (SELECT 1 FROM job_applications ja JOIN job_postings jp ON jp.id = ja.job_id WHERE ja.id = application_id AND jp.industry_id = auth.uid())
  ))
  OR
  (application_type = 'ipn' AND (
    EXISTS (SELECT 1 FROM ipn_applications ia WHERE ia.id = application_id AND ia.applicant_id = auth.uid())
    OR EXISTS (SELECT 1 FROM ipn_applications ia JOIN ipn_opportunities io ON io.id = ia.opportunity_id WHERE ia.id = application_id AND io.ipn_user_id = auth.uid())
  ))
);

CREATE INDEX idx_job_feedback_messages_app ON public.job_feedback_messages(application_id, application_type);
