-- Create public storage bucket for document assets if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'databases'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('databases', 'databases', true);
  END IF;
END $$;

-- Policies for the databases bucket
-- Allow public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can read databases bucket'
  ) THEN
    CREATE POLICY "Public can read databases bucket"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'databases');
  END IF;
END $$;

-- Allow anyone (including anon) to upload to this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can upload to databases bucket'
  ) THEN
    CREATE POLICY "Anyone can upload to databases bucket"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'databases');
  END IF;
END $$;

-- Allow overwriting/updating files in this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can update databases bucket'
  ) THEN
    CREATE POLICY "Anyone can update databases bucket"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'databases')
    WITH CHECK (bucket_id = 'databases');
  END IF;
END $$;
