-- Create storage buckets for enterprise uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('enterprise-templates', 'enterprise-templates', false),
  ('enterprise-components', 'enterprise-components', false),
  ('enterprise-nodes', 'enterprise-nodes', false);

-- Create enterprise uploads table
CREATE TABLE public.enterprise_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('template', 'component', 'node')),
  file_size INTEGER NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enterprise_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for enterprise uploads
CREATE POLICY "Enterprise members can upload files" 
ON public.enterprise_uploads 
FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

CREATE POLICY "Enterprise members can view their workspace uploads" 
ON public.enterprise_uploads 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

CREATE POLICY "Enterprise members can update their workspace uploads" 
ON public.enterprise_uploads 
FOR UPDATE 
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

CREATE POLICY "Enterprise members can delete their workspace uploads" 
ON public.enterprise_uploads 
FOR DELETE 
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

-- Create storage policies for enterprise templates
CREATE POLICY "Enterprise members can upload templates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'enterprise-templates' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

CREATE POLICY "Enterprise members can view their workspace templates" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'enterprise-templates' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

-- Create storage policies for enterprise components
CREATE POLICY "Enterprise members can upload components" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'enterprise-components' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

CREATE POLICY "Enterprise members can view their workspace components" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'enterprise-components' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

-- Create storage policies for enterprise nodes
CREATE POLICY "Enterprise members can upload nodes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'enterprise-nodes' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

CREATE POLICY "Enterprise members can view their workspace nodes" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'enterprise-nodes' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_enterprise_uploads_updated_at
BEFORE UPDATE ON public.enterprise_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();