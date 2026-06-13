-- Create table for external supervisor invites (by students)
CREATE TABLE public.external_supervisor_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  invite_code VARCHAR(32) NOT NULL UNIQUE,
  department VARCHAR(255),
  institution_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_supervisor_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own invites"
ON public.external_supervisor_invites FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can create invites"
ON public.external_supervisor_invites FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Public can view invites by code"
ON public.external_supervisor_invites FOR SELECT
USING (true);

CREATE POLICY "Students can update their invites"
ON public.external_supervisor_invites FOR UPDATE
USING (auth.uid() = student_id);

-- Create table for referral codes
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  code VARCHAR(16) NOT NULL UNIQUE,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  credits_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own referral code"
ON public.referral_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their referral code"
ON public.referral_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their referral code"
ON public.referral_codes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Public can view referral codes for validation"
ON public.referral_codes FOR SELECT
USING (true);

-- Create table for referral usages
CREATE TABLE public.referral_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  credits_awarded INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_usages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their referral usages"
ON public.referral_usages FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "System can insert referral usages"
ON public.referral_usages FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_external_supervisor_invites_updated_at
BEFORE UPDATE ON public.external_supervisor_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_codes_updated_at
BEFORE UPDATE ON public.referral_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();