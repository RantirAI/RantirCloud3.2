
INSERT INTO public.integrations (integration_id, name, description, category, icon, provider, is_completed, is_enabled, requires_installation, priority, node_type)
VALUES
  ('datafuel', 'DataFuel', 'Enrich contacts and companies with AI-powered data from DataFuel', 'Business Operations', 'https://cdn.activepieces.com/pieces/datafuel.png', 'datafuel', true, true, true, 50, 'datafuel'),
  ('date-helper', 'Date Helper', 'Manipulate, format, and calculate dates and times', 'Productivity', 'https://cdn.activepieces.com/pieces/date-helper.png', 'date-helper', true, true, true, 50, 'date-helper'),
  ('datocms', 'DatoCMS', 'Manage content with DatoCMS headless CMS', 'Development', 'https://cdn.activepieces.com/pieces/datocms.png', 'datocms', true, true, true, 50, 'datocms'),
  ('deepgram', 'Deepgram', 'AI-powered speech-to-text, text-to-speech, and audio intelligence', 'LLMs / Gen AI', 'https://cdn.activepieces.com/pieces/deepgram.png', 'deepgram', true, true, true, 50, 'deepgram')
ON CONFLICT (integration_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  provider = EXCLUDED.provider,
  is_completed = EXCLUDED.is_completed,
  is_enabled = EXCLUDED.is_enabled,
  node_type = EXCLUDED.node_type,
  updated_at = now();
