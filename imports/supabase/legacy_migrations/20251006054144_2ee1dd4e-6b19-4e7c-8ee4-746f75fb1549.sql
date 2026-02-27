-- Insert Twitter integration if it doesn't exist
INSERT INTO public.integrations (integration_id, name, description, icon, category, provider, node_type, requires_installation, is_completed, is_enabled, priority, "LongDescription")
VALUES (
  'twitter',
  'Twitter (X)',
  'Post tweets and interact with Twitter API',
  'Twitter',
  'Channels',
  'simplegreatbots',
  'twitter',
  true,
  true,
  true,
  100,
  'Connect your Twitter account to post tweets, get user information, and interact with the Twitter API. Requires Twitter API credentials (Consumer Key, Consumer Secret, Access Token, and Access Token Secret).'
)
ON CONFLICT (integration_id) DO NOTHING;

-- Insert Slack integration if it doesn't exist
INSERT INTO public.integrations (integration_id, name, description, icon, category, provider, node_type, requires_installation, is_completed, is_enabled, priority, "LongDescription")
VALUES (
  'slack',
  'Slack',
  'Send messages and interact with Slack',
  'MessageSquare',
  'Channels',
  'simplegreatbots',
  'slack',
  true,
  true,
  true,
  100,
  'Connect your Slack workspace to send messages, list channels, and automate team communication. Requires a Slack Bot Token with appropriate permissions.'
)
ON CONFLICT (integration_id) DO NOTHING;

-- Insert Notion integration if it doesn't exist
INSERT INTO public.integrations (integration_id, name, description, icon, category, provider, node_type, requires_installation, is_completed, is_enabled, priority, "LongDescription")
VALUES (
  'notion',
  'Notion',
  'Create and manage Notion pages and databases',
  'FileText',
  'Productivity',
  'simplegreatbots',
  'notion',
  true,
  true,
  true,
  100,
  'Connect to Notion to create pages, update content, and query databases. Perfect for automating documentation and knowledge management workflows. Requires a Notion API key.'
)
ON CONFLICT (integration_id) DO NOTHING;

-- Insert Google Calendar integration if it doesn't exist
INSERT INTO public.integrations (integration_id, name, description, icon, category, provider, node_type, requires_installation, is_completed, is_enabled, priority, "LongDescription")
VALUES (
  'google-calendar',
  'Google Calendar',
  'Create and manage Google Calendar events',
  'Calendar',
  'Productivity',
  'simplegreatbots',
  'google-calendar',
  true,
  true,
  true,
  100,
  'Automate your scheduling with Google Calendar integration. Create, update, delete, and list calendar events. Requires Google Calendar API access token with calendar permissions.'
)
ON CONFLICT (integration_id) DO NOTHING;

-- Insert WooCommerce integration if it doesn't exist
INSERT INTO public.integrations (integration_id, name, description, icon, category, provider, node_type, requires_installation, is_completed, is_enabled, priority, "LongDescription")
VALUES (
  'woocommerce',
  'WooCommerce',
  'Manage WooCommerce products and orders',
  'ShoppingCart',
  'Business Operations',
  'simplegreatbots',
  'woocommerce',
  true,
  true,
  true,
  100,
  'Connect to your WooCommerce store to manage products, retrieve orders, and automate e-commerce workflows. Requires WooCommerce REST API credentials (Consumer Key and Secret) and your store URL.'
)
ON CONFLICT (integration_id) DO NOTHING;

-- Insert Assembled integration if it doesn't exist
INSERT INTO public.integrations (integration_id, name, description, icon, category, provider, node_type, requires_installation, is_completed, is_enabled, priority, "LongDescription")
VALUES (
  'assembled',
  'Assembled',
  'Workforce management and scheduling',
  'Users',
  'Business Operations',
  'simplegreatbots',
  'assembled',
  true,
  true,
  true,
  100,
  'Manage workforce scheduling and agent data with Assembled. Get agent information, list agents, and create schedules. Requires an Assembled API key.'
)
ON CONFLICT (integration_id) DO NOTHING;

-- Insert AssemblyAI integration if it doesn't exist
INSERT INTO public.integrations (integration_id, name, description, icon, category, provider, node_type, requires_installation, is_completed, is_enabled, priority, "LongDescription")
VALUES (
  'assemblyai',
  'AssemblyAI',
  'Speech-to-text transcription and audio intelligence',
  'Mic',
  'LLMs / Gen AI',
  'simplegreatbots',
  'assemblyai',
  true,
  true,
  true,
  100,
  'Transcribe audio files with AssemblyAI''s advanced speech recognition. Supports speaker labels, sentiment analysis, and other audio intelligence features. Requires an AssemblyAI API key.'
)
ON CONFLICT (integration_id) DO NOTHING;