-- Create drive_folders table
CREATE TABLE drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES drive_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#3B82F6',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create drive_files table
CREATE TABLE drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES drive_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  thumbnail_url TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  shared_with UUID[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drive_folders
CREATE POLICY "Users can manage folders in their databases"
ON drive_folders
FOR ALL
USING (
  database_id IN (
    SELECT id FROM databases WHERE user_id = auth.uid()
  )
);

-- RLS Policies for drive_files
CREATE POLICY "Users can manage files in their databases"
ON drive_files
FOR ALL
USING (
  database_id IN (
    SELECT id FROM databases WHERE user_id = auth.uid()
  )
  OR auth.uid() = ANY(shared_with)
);

-- Create storage bucket for drive files
INSERT INTO storage.buckets (id, name, public)
VALUES ('database-drive-files', 'database-drive-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload files to their databases"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'database-drive-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM databases WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view files in their databases"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'database-drive-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM databases WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete files in their databases"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'database-drive-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM databases WHERE user_id = auth.uid()
  )
);