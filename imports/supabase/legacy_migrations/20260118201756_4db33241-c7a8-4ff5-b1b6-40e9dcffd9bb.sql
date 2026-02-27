-- Add scope and initial_value columns to app_variables table
ALTER TABLE public.app_variables 
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'app' CHECK (scope IN ('app', 'global')),
ADD COLUMN IF NOT EXISTS initial_value JSONB,
ADD COLUMN IF NOT EXISTS preserve_on_navigation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS data_type TEXT DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'object', 'array', 'date'));

-- Create page_variables table for page-scoped variables
CREATE TABLE IF NOT EXISTS public.page_variables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_project_id UUID NOT NULL REFERENCES public.app_projects(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'object', 'array', 'date')),
  initial_value JSONB,
  description TEXT,
  is_persisted BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(app_project_id, page_id, name)
);

-- Enable RLS on page_variables
ALTER TABLE public.page_variables ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for page_variables
CREATE POLICY "Users can view their own page variables"
ON public.page_variables
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own page variables"
ON public.page_variables
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own page variables"
ON public.page_variables
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own page variables"
ON public.page_variables
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updating page_variables timestamp
CREATE OR REPLACE FUNCTION public.update_page_variables_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_page_variables_updated_at
  BEFORE UPDATE ON public.page_variables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_page_variables_timestamp();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_page_variables_project_page ON public.page_variables(app_project_id, page_id);
CREATE INDEX IF NOT EXISTS idx_page_variables_user ON public.page_variables(user_id);