-- Add storage policy for supervisors to upload feedback files to research-papers bucket
CREATE POLICY "Supervisors can upload feedback files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'research-papers' AND
  EXISTS (
    SELECT 1 FROM research_papers rp
    WHERE (
      rp.id::text = (storage.foldername(name))[1]
      AND (rp.supervisor_id = auth.uid() OR rp.co_supervisor_id = auth.uid())
    )
  )
);

-- Add storage policy for supervisors to view feedback files
CREATE POLICY "Supervisors can view feedback files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'research-papers' AND
  EXISTS (
    SELECT 1 FROM research_papers rp
    WHERE (
      rp.id::text = (storage.foldername(name))[1]
      AND (rp.supervisor_id = auth.uid() OR rp.co_supervisor_id = auth.uid())
    )
  )
);

-- Add storage policy for students to view feedback files for their research
CREATE POLICY "Students can view supervisor feedback files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'research-papers' AND
  EXISTS (
    SELECT 1 FROM research_papers rp
    WHERE (
      rp.id::text = (storage.foldername(name))[1]
      AND rp.author_id = auth.uid()
    )
  )
);