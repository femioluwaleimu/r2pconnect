-- Make documentaries bucket private for better security
UPDATE storage.buckets 
SET public = false 
WHERE id = 'documentaries';

-- Add RLS policies for documentaries bucket
-- Allow authenticated users to read documentaries
CREATE POLICY "Authenticated users can read documentaries" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documentaries' AND auth.role() = 'authenticated');

-- Allow admins to upload documentaries
CREATE POLICY "Admins can upload documentaries" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documentaries' AND EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Allow admins to update documentaries
CREATE POLICY "Admins can update documentaries" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documentaries' AND EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Allow admins to delete documentaries
CREATE POLICY "Admins can delete documentaries" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documentaries' AND EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));