-- Recreate the supervisor feedback upload insert policy with correct status values
-- Allow uploads when supervisor_approval_status is 'pending' or 'revision_requested'
-- OR status is 'under_review' or 'revision_requested' (valid enum values)

DROP POLICY IF EXISTS "Supervisors can insert feedback files" ON public.supervisor_feedback_uploads;

CREATE POLICY "Supervisors can insert feedback files"
ON public.supervisor_feedback_uploads
FOR INSERT
WITH CHECK (
  auth.uid() = supervisor_id
  AND EXISTS (
    SELECT 1 FROM research_papers rp
    WHERE rp.id = supervisor_feedback_uploads.research_id
    AND (rp.supervisor_id = auth.uid() OR rp.co_supervisor_id = auth.uid())
    AND (
      rp.supervisor_approval_status IN ('pending', 'revision_requested')
      OR rp.status::text IN ('under_review', 'revision_requested')
    )
  )
);