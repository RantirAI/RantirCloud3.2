-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon_url TEXT,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Create policies for workspaces
CREATE POLICY "Users can manage their own workspaces" 
ON public.workspaces 
FOR ALL 
USING (auth.uid() = user_id);

-- Add workspace_id to user_settings to track current workspace
ALTER TABLE public.user_settings 
ADD COLUMN current_workspace_id UUID;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create default workspace for existing users
INSERT INTO public.workspaces (user_id, name, is_default)
SELECT id, 'My Workspace', true
FROM auth.users
WHERE id IN (SELECT id FROM public.user_settings);