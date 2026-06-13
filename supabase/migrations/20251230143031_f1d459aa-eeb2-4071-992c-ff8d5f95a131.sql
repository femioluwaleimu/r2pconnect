-- Create researcher_invites table for tracking invitations
CREATE TABLE public.researcher_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_id UUID NOT NULL,
  researcher_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.challenge_matches(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invite_messages table for chat between industry and researcher
CREATE TABLE public.invite_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id UUID NOT NULL REFERENCES public.researcher_invites(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.researcher_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for researcher_invites
CREATE POLICY "Industry can view own invites" ON public.researcher_invites
  FOR SELECT USING (auth.uid() = industry_id);

CREATE POLICY "Industry can insert invites" ON public.researcher_invites
  FOR INSERT WITH CHECK (auth.uid() = industry_id);

CREATE POLICY "Industry can update own invites" ON public.researcher_invites
  FOR UPDATE USING (auth.uid() = industry_id);

CREATE POLICY "Researchers can view their invites" ON public.researcher_invites
  FOR SELECT USING (auth.uid() = researcher_id);

CREATE POLICY "Researchers can update their invites" ON public.researcher_invites
  FOR UPDATE USING (auth.uid() = researcher_id);

-- RLS policies for invite_messages
CREATE POLICY "Participants can view invite messages" ON public.invite_messages
  FOR SELECT USING (
    invite_id IN (
      SELECT id FROM public.researcher_invites 
      WHERE industry_id = auth.uid() OR researcher_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send invite messages" ON public.invite_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    invite_id IN (
      SELECT id FROM public.researcher_invites 
      WHERE industry_id = auth.uid() OR researcher_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_researcher_invites_updated_at
  BEFORE UPDATE ON public.researcher_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.researcher_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invite_messages;