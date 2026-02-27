-- Add user_components JSONB column to app_projects table
ALTER TABLE public.app_projects 
ADD COLUMN IF NOT EXISTS user_components jsonb DEFAULT '{"version": 1, "components": [], "categories": []}'::jsonb;