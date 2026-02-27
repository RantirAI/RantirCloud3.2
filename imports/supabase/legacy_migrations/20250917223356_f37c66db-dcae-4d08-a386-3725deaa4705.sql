-- Update enterprise_uploads to include new file types
ALTER TABLE public.enterprise_uploads 
DROP CONSTRAINT IF EXISTS enterprise_uploads_file_type_check;

ALTER TABLE public.enterprise_uploads 
ADD CONSTRAINT enterprise_uploads_file_type_check 
CHECK (file_type IN ('template', 'component', 'node', 'dataset', 'api'));

-- Create storage bucket for datasets/APIs
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('enterprise-datasets', 'enterprise-datasets', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for enterprise datasets
CREATE POLICY "Enterprise members can upload datasets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'enterprise-datasets' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

CREATE POLICY "Enterprise members can view their workspace datasets" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'enterprise-datasets' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

-- Update existing component uploads to use enterprise-components bucket instead of enterprise-templates
-- Note: This is a data migration, existing files will need to be moved manually if needed