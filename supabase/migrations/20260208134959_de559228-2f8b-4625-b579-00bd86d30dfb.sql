-- Fix the overly permissive INSERT policy on referral_usages
-- Only allow insert when the referred user is the current user (registering)
DROP POLICY IF EXISTS "System can insert referral usages" ON public.referral_usages;

CREATE POLICY "Users can record their own referral"
ON public.referral_usages FOR INSERT
WITH CHECK (auth.uid() = referred_user_id);