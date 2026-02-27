-- Create workspace customization table
CREATE TABLE public.workspace_customization (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE,
  logo_url TEXT,
  navigation_bg_color TEXT DEFAULT '#ffffff',
  navigation_text_color TEXT DEFAULT '#000000',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_customization ENABLE ROW LEVEL SECURITY;

-- Create policies for workspace customization
CREATE POLICY "Enterprise members can view their workspace customization" 
ON public.workspace_customization 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
  )
);

CREATE POLICY "Enterprise admins can manage workspace customization" 
ON public.workspace_customization 
FOR ALL 
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND user_group = 'enterprise'
    AND role IN ('owner', 'admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_workspace_customization_updated_at
BEFORE UPDATE ON public.workspace_customization
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default customization for existing enterprise workspaces
INSERT INTO public.workspace_customization (workspace_id)
SELECT DISTINCT w.id
FROM workspaces w
WHERE w.is_enterprise = true
ON CONFLICT (workspace_id) DO NOTHING;