-- Create reviewer_invites table to track pending reviewer invitations
CREATE TABLE IF NOT EXISTS public.reviewer_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviewer_invites ENABLE ROW LEVEL SECURITY;

-- Policies for reviewer_invites
CREATE POLICY "Institution admins can manage their reviewer invites"
  ON public.reviewer_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.institutions 
      WHERE id = reviewer_invites.institution_id 
      AND admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read reviewer invites by code for registration"
  ON public.reviewer_invites
  FOR SELECT
  USING (true);