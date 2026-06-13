-- Enable realtime for research_papers table for supervisor notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.research_papers;