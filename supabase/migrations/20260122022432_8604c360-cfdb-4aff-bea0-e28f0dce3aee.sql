-- Add file attachment columns to supervisor_student_messages table
ALTER TABLE public.supervisor_student_messages
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for message attachments
-- Allow supervisors and students to upload attachments
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' AND
  auth.uid() IS NOT NULL
);

-- Allow supervisors and students to view attachments in their conversations
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments' AND
  auth.uid() IS NOT NULL
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);