
-- Botpress Integrations Schema
CREATE TABLE IF NOT EXISTS public.botpress_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL,
  provider TEXT NOT NULL,
  version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL
);

-- User Installed Integrations
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.botpress_integrations(id) ON DELETE CASCADE,
  configuration JSONB DEFAULT '{}'::jsonb NOT NULL,
  api_key TEXT,
  auth_token TEXT,
  oauth_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(user_id, integration_id)
);

-- Integration Categories
CREATE TABLE IF NOT EXISTS public.integration_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert default categories
INSERT INTO public.integration_categories (name, icon, description)
VALUES 
  ('Productivity', '💼', 'Tools for task and project management'),
  ('Channels', '📱', 'Communication channels for your bot'),
  ('Automation', '⚙️', 'Automate workflows and tasks'),
  ('Development', '💻', 'Developer tools and APIs'),
  ('Support', '🛟', 'Customer support and helpdesk tools'),
  ('Analytics', '📊', 'Track and analyze metrics'),
  ('Business Operations', '🏢', 'Tools for business processes'),
  ('LLMs / Gen AI', '✨', 'AI and machine learning capabilities')
ON CONFLICT (name) DO NOTHING;

-- Insert some default integrations
INSERT INTO public.botpress_integrations 
  (integration_id, name, description, icon, category, provider, version)
VALUES
  ('asana', 'Asana', 'Asana integration for Botpress', 'https://cdn.botpress.cloud/integrations/asana/icon.png', 'Productivity', 'botpress', '1.0.0'),
  ('messaging-api', 'Messaging API', 'This integration allows you to easily send messages to your bot and get responses back to your endpoint.', 'https://cdn.botpress.cloud/integrations/messaging-api/icon.png', 'Channels', 'plus', '1.0.0'),
  ('wikipedia', 'Wikipedia', 'This integration allows you to use Wikipedia.', 'https://cdn.botpress.cloud/integrations/wikipedia/icon.png', 'Development', 'simplegreatbots', '1.0.0'),
  ('jira', 'Jira actions', 'This integration allows you to manipulate Jira issues and users.', 'https://cdn.botpress.cloud/integrations/jira/icon.png', 'Productivity', 'plus', '1.0.0'),
  ('uuid', 'UUID', 'This integration allows you to create unique IDs using the UUID library.', 'https://cdn.botpress.cloud/integrations/uuid/icon.png', 'Development', 'simplegreatbots', '1.0.0'),
  ('segment', 'Segment', 'Track Botpress Analytics events in Segment', 'https://cdn.botpress.cloud/integrations/segment/icon.png', 'Analytics', 'plus', '1.0.0'),
  ('dalle', 'DALL-E Image Generation', 'Integrate DALL-E to generate stunning and unique images directly within your chatbot conversations', 'https://cdn.botpress.cloud/integrations/dalle/icon.png', 'LLMs / Gen AI', 'simplegreatbots', '1.0.0'),
  ('make', 'Make.com', 'Seamlessly connect your Botpress chatbot with Make.com to unlock a world of possibilities.', 'https://cdn.botpress.cloud/integrations/make/icon.png', 'Automation', 'decay', '1.0.0'),
  ('mixpanel', 'Mixpanel', 'Integrate Mixpanel with Botpress', 'https://cdn.botpress.cloud/integrations/mixpanel/icon.png', 'Analytics', 'plus', '1.0.0'),
  ('gmail', 'Gmail', 'Send emails through Gmail', 'https://cdn.botpress.cloud/integrations/gmail/icon.png', 'Channels', 'botpress', '1.0.0'),
  ('openai', 'OpenAI', 'Generate text using OpenAI models', 'https://cdn.botpress.cloud/integrations/openai/icon.png', 'LLMs / Gen AI', 'botpress', '1.0.0')
ON CONFLICT (integration_id) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS botpress_integrations_category_idx ON public.botpress_integrations(category);
CREATE INDEX IF NOT EXISTS user_integrations_user_id_idx ON public.user_integrations(user_id);

-- Row level security policies
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Policy for user_integrations - users can only access their own integrations
CREATE POLICY user_integrations_user_policy 
  ON public.user_integrations 
  FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid());

-- Allow read-only access to the integration catalog for all authenticated users
ALTER TABLE public.botpress_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY botpress_integrations_read_policy
  ON public.botpress_integrations
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow read-only access to integration categories for all authenticated users
ALTER TABLE public.integration_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY integration_categories_read_policy
  ON public.integration_categories
  FOR SELECT
  TO authenticated
  USING (true);
