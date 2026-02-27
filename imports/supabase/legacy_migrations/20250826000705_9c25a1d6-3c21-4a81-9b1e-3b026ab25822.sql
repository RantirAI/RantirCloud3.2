-- Add form_config column to table_projects for storing form configuration
ALTER TABLE public.table_projects 
ADD COLUMN form_config jsonb DEFAULT '{}'::jsonb;