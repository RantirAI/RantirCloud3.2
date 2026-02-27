-- Create workspace_icons storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-icons', 'workspace-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for workspace-icons bucket
CREATE POLICY "Users can upload their workspace icons"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'workspace-icons' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Workspace icons are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'workspace-icons');

CREATE POLICY "Users can update their workspace icons"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'workspace-icons' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their workspace icons"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'workspace-icons' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);