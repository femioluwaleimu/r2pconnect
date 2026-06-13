-- Add read_at timestamp for read receipts
ALTER TABLE public.supervisor_student_messages
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update existing read messages to have a read_at timestamp
UPDATE public.supervisor_student_messages
SET read_at = created_at
WHERE is_read = true AND read_at IS NULL;