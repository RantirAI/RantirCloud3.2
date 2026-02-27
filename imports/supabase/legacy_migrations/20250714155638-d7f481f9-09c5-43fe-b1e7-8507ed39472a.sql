-- Create app_projects table for storing app builder projects
CREATE TABLE public.app_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  global_styles JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_projects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own app projects" 
ON public.app_projects 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_app_projects_updated_at
BEFORE UPDATE ON public.app_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_table_project_timestamp();

-- Create app_components table for reusable components
CREATE TABLE public.app_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  app_project_id UUID NOT NULL REFERENCES public.app_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  component_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_components ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage components for their app projects" 
ON public.app_components 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_app_components_updated_at
BEFORE UPDATE ON public.app_components
FOR EACH ROW
EXECUTE FUNCTION public.update_table_project_timestamp();