-- Create storage bucket for platform assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view platform assets
CREATE POLICY "Anyone can view platform assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'platform-assets');

-- Only admins can upload platform assets
CREATE POLICY "Admins can upload platform assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'platform-assets' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Only admins can update platform assets
CREATE POLICY "Admins can update platform assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'platform-assets' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Only admins can delete platform assets
CREATE POLICY "Admins can delete platform assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'platform-assets' 
  AND has_role(auth.uid(), 'admin'::app_role)
);