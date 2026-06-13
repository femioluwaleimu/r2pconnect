-- Create verification_codes table for email and password reset codes
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, type)
);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can manage verification codes (no public access)
CREATE POLICY "Service role manages verification codes"
ON public.verification_codes
FOR ALL
USING (false)
WITH CHECK (false);

-- Create index for faster lookups
CREATE INDEX idx_verification_codes_email_type ON public.verification_codes(email, type);
CREATE INDEX idx_verification_codes_expires ON public.verification_codes(expires_at);

-- Add email_verified column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;
END $$;