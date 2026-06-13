-- Add fields_of_interest column to profiles for lecturers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fields_of_interest text[] NULL;

-- Add RLS policy to allow institution admins to upload to platform-assets bucket
CREATE POLICY "Institution admins can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'platform-assets' 
  AND auth.uid() IN (SELECT admin_user_id FROM public.institutions WHERE admin_user_id = auth.uid())
);

-- Allow institution admins to update their logos
CREATE POLICY "Institution admins can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'platform-assets'
  AND auth.uid() IN (SELECT admin_user_id FROM public.institutions WHERE admin_user_id = auth.uid())
);

-- Allow institution admins to delete their logos
CREATE POLICY "Institution admins can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'platform-assets'
  AND auth.uid() IN (SELECT admin_user_id FROM public.institutions WHERE admin_user_id = auth.uid())
);