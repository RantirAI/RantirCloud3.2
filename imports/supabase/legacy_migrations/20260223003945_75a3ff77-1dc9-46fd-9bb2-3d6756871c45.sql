ALTER TABLE public.flow_projects
ADD COLUMN IF NOT EXISTS chat_widget_config jsonb DEFAULT '{}'::jsonb;