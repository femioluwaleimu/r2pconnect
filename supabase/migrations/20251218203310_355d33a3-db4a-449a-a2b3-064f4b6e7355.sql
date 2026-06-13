-- Fix: Institution Verification Codes Exposed to Public
-- Move verification_code to a separate protected table

-- 1. Create a separate table for verification codes (admin-only access)
CREATE TABLE IF NOT EXISTS public.institution_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL UNIQUE REFERENCES public.institutions(id) ON DELETE CASCADE,
  verification_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.institution_verification_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can view verification codes
CREATE POLICY "Admins can view verification codes"
ON public.institution_verification_codes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert verification codes
CREATE POLICY "Admins can insert verification codes"
ON public.institution_verification_codes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update verification codes
CREATE POLICY "Admins can update verification codes"
ON public.institution_verification_codes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete verification codes
CREATE POLICY "Admins can delete verification codes"
ON public.institution_verification_codes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Migrate existing verification codes to the new table
INSERT INTO public.institution_verification_codes (institution_id, verification_code)
SELECT id, verification_code FROM public.institutions
WHERE verification_code IS NOT NULL
ON CONFLICT (institution_id) DO NOTHING;

-- 3. Drop the verification_code column from institutions table
ALTER TABLE public.institutions DROP COLUMN IF EXISTS verification_code;