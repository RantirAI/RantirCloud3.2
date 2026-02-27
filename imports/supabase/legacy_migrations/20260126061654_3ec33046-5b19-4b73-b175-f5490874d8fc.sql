-- Insert new integrations if they don't exist
INSERT INTO public.integrations (integration_id, name, description, icon, category, provider, is_enabled, is_completed, node_type, priority)
VALUES 
  ('contentful', 'Contentful', 'Headless CMS for managing digital content across platforms', 'https://images.ctfassets.net/fo9twyrwpveg/44baP9Gtm8qE2Umm8CQwQk/c43325463d1cb5db2ef97fca0788ea55/contentful-logo.svg', 'Business Operations', 'contentful', true, true, 'contentful', 100),
  ('contextual-ai', 'Contextual AI', 'Advanced AI platform for context-aware responses and grounded AI', 'https://contextual.ai/favicon.ico', 'LLMs / Gen AI', 'contextual', true, true, 'contextual-ai', 100),
  ('contiguity', 'Contiguity', 'Communication platform for SMS, calls, and messaging', 'https://contiguity.co/favicon.ico', 'Channels', 'contiguity', true, true, 'contiguity', 100),
  ('convertkit', 'ConvertKit', 'Email marketing platform for creators and newsletters', 'https://convertkit.com/favicon.ico', 'Channels', 'convertkit', true, true, 'convertkit', 100),
  ('copper', 'Copper', 'CRM platform built for Google Workspace', 'https://www.copper.com/favicon.ico', 'Business Operations', 'copper', true, true, 'copper', 100),
  ('copy-ai', 'Copy.ai', 'AI-powered copywriting and content generation platform', 'https://www.copy.ai/favicon.ico', 'LLMs / Gen AI', 'copyai', true, true, 'copy-ai', 100)
ON CONFLICT (integration_id) DO NOTHING;