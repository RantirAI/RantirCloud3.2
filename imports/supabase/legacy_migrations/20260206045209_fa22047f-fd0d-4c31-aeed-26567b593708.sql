-- Create storage bucket for app project assets
-- This allows assets to be stored per-project without requiring a database drive connection

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-project-assets',
  'app-project-assets',
  true,
  52428800, -- 50MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the app-project-assets bucket

-- Policy: Anyone can view public assets
CREATE POLICY "Public access for app project assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-project-assets');

-- Policy: Authenticated users can upload to their project folders
CREATE POLICY "Authenticated users can upload app project assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'app-project-assets');

-- Policy: Authenticated users can update their own uploads
CREATE POLICY "Users can update own app project assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'app-project-assets' AND owner_id::text = auth.uid()::text);

-- Policy: Authenticated users can delete from project folders
CREATE POLICY "Authenticated users can delete app project assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'app-project-assets');