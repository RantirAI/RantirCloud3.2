-- Add plugin visibility settings to workspace_customization
ALTER TABLE public.workspace_customization 
ADD COLUMN IF NOT EXISTS enabled_plugins jsonb DEFAULT '{"data_documents": true, "logic_flows": true, "app_builder": true, "ai_cloud": true, "plugins": true}'::jsonb;

-- Update existing rows to have default values
UPDATE public.workspace_customization 
SET enabled_plugins = '{"data_documents": true, "logic_flows": true, "app_builder": true, "ai_cloud": true, "plugins": true}'::jsonb
WHERE enabled_plugins IS NULL;