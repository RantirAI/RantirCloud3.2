-- Insert Bigin by Zoho integration record
INSERT INTO integrations (
  integration_id,
  name,
  description,
  provider,
  category,
  icon,
  requires_installation,
  is_enabled,
  node_type,
  installation_config,
  priority,
  version
) VALUES (
  'bigin-by-zoho',
  'Bigin by Zoho',
  'Integrate with Bigin by Zoho CRM to manage contacts and deals',
  'zoho',
  'Business Operations',
  '🏢',
  true,
  true,
  'bigin-by-zoho',
  '{"requiresApiKey": true, "apiKeyLabel": "Bigin API Key", "apiKeyDescription": "Your Bigin by Zoho OAuth token"}'::jsonb,
  0,
  '1.0.0'
)
ON CONFLICT (integration_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  provider = EXCLUDED.provider,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  requires_installation = EXCLUDED.requires_installation,
  is_enabled = EXCLUDED.is_enabled,
  node_type = EXCLUDED.node_type,
  installation_config = EXCLUDED.installation_config,
  updated_at = now();