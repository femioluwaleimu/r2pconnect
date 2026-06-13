-- Create supervisor_student_messages table for direct messaging
CREATE TABLE public.supervisor_student_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_supervisor_student_messages_supervisor ON public.supervisor_student_messages(supervisor_id);
CREATE INDEX idx_supervisor_student_messages_student ON public.supervisor_student_messages(student_id);
CREATE INDEX idx_supervisor_student_messages_created ON public.supervisor_student_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.supervisor_student_messages ENABLE ROW LEVEL SECURITY;

-- Supervisors can view messages for their students
CREATE POLICY "Supervisors can view their student messages"
ON public.supervisor_student_messages
FOR SELECT
USING (auth.uid() = supervisor_id OR auth.uid() = student_id);

-- Supervisors can send messages to their students (verified via research_papers relationship)
CREATE POLICY "Supervisors can send messages to their students"
ON public.supervisor_student_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND (
    -- Supervisor sending to student
    (auth.uid() = supervisor_id AND EXISTS (
      SELECT 1 FROM public.research_papers rp
      WHERE rp.supervisor_id = auth.uid() AND rp.author_id = student_id AND rp.research_type = 'student'
    ))
    OR
    -- Student replying to supervisor
    (auth.uid() = student_id AND EXISTS (
      SELECT 1 FROM public.research_papers rp
      WHERE rp.supervisor_id = supervisor_id AND rp.author_id = auth.uid() AND rp.research_type = 'student'
    ))
  )
);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisor_student_messages;