-- Create researcher collaborations table
CREATE TABLE public.researcher_collaborations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'rejected')),
  match_score INTEGER,
  match_reason TEXT,
  research_overlap TEXT[],
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_users CHECK (requester_id != recipient_id)
);

-- Create collaboration messages table
CREATE TABLE public.collaboration_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaboration_id UUID NOT NULL REFERENCES public.researcher_collaborations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.researcher_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for researcher_collaborations
CREATE POLICY "Users can view their own collaborations"
ON public.researcher_collaborations
FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create collaboration requests"
ON public.researcher_collaborations
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own collaborations"
ON public.researcher_collaborations
FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- RLS policies for collaboration_messages
CREATE POLICY "Users can view messages in their collaborations"
ON public.collaboration_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.researcher_collaborations rc
    WHERE rc.id = collaboration_id
    AND (rc.requester_id = auth.uid() OR rc.recipient_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their collaborations"
ON public.collaboration_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.researcher_collaborations rc
    WHERE rc.id = collaboration_id
    AND (rc.requester_id = auth.uid() OR rc.recipient_id = auth.uid())
    AND rc.status = 'active'
  )
);

CREATE POLICY "Users can update message read status"
ON public.collaboration_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.researcher_collaborations rc
    WHERE rc.id = collaboration_id
    AND (rc.requester_id = auth.uid() OR rc.recipient_id = auth.uid())
  )
);

-- Create indexes for performance
CREATE INDEX idx_collaborations_requester ON public.researcher_collaborations(requester_id);
CREATE INDEX idx_collaborations_recipient ON public.researcher_collaborations(recipient_id);
CREATE INDEX idx_collaborations_status ON public.researcher_collaborations(status);
CREATE INDEX idx_collab_messages_collaboration ON public.collaboration_messages(collaboration_id);
CREATE INDEX idx_collab_messages_sender ON public.collaboration_messages(sender_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_messages;

-- Create trigger for updated_at
CREATE TRIGGER update_researcher_collaborations_updated_at
BEFORE UPDATE ON public.researcher_collaborations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();