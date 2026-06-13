-- Fix RLS policies for admin access

-- Allow admins to view ALL institutions (not just verified ones)
CREATE POLICY "Admins can view all institutions"
ON public.institutions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any institution
CREATE POLICY "Admins can update institutions"
ON public.institutions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete institutions
CREATE POLICY "Admins can delete institutions"
ON public.institutions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view ALL user roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update user roles
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view ALL research papers
CREATE POLICY "Admins can view all research papers"
ON public.research_papers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any research paper
CREATE POLICY "Admins can update any research paper"
ON public.research_papers
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage challenges
CREATE POLICY "Admins can view all challenges"
ON public.challenges
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert challenges"
ON public.challenges
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update challenges"
ON public.challenges
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete challenges"
ON public.challenges
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create platform_settings table for admin settings
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view platform settings"
ON public.platform_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert platform settings"
ON public.platform_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update platform settings"
ON public.platform_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add company_address to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_address TEXT;