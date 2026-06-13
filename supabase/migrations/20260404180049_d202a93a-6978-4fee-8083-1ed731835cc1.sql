
-- Allow IPN users to upload logos to platform-assets
CREATE POLICY "IPN users can upload to platform-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'platform-assets'
  AND has_role(auth.uid(), 'ipn'::app_role)
);

-- Allow IPN users to update their uploads
CREATE POLICY "IPN users can update platform-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'platform-assets'
  AND has_role(auth.uid(), 'ipn'::app_role)
);

-- Fix ipn_companies UPDATE policy to include WITH CHECK
DROP POLICY "IPN users can update own companies" ON public.ipn_companies;
CREATE POLICY "IPN users can update own companies"
ON public.ipn_companies
FOR UPDATE
TO authenticated
USING (auth.uid() = ipn_user_id)
WITH CHECK (auth.uid() = ipn_user_id);
