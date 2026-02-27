-- Create table for storing style classes
CREATE TABLE public.style_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  app_project_id uuid NOT NULL,
  name text NOT NULL,
  styles jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_to jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.style_classes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own style classes" 
ON public.style_classes 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_style_classes_updated_at
BEFORE UPDATE ON public.style_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_table_project_timestamp();