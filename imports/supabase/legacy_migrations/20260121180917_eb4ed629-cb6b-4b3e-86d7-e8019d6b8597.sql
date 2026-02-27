-- Create app-assets storage bucket for App Builder generated images
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access for app-assets
CREATE POLICY "Public read access for app-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-assets');

-- Allow authenticated users to upload to app-assets
CREATE POLICY "Authenticated users can upload app-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'app-assets' AND auth.role() = 'authenticated');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own app-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'app-assets' AND auth.uid()::text = (storage.foldername(name))[2]);