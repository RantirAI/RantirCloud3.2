-- Add Airtable integration to the integrations table
INSERT INTO integrations (
  integration_id,
  name,
  description,
  category,
  provider,
  icon,
  node_type,
  requires_installation,
  is_completed,
  is_enabled
) VALUES (
  'airtable',
  'Airtable',
  'Connect to Airtable to manage your data and records across bases and tables',
  'Productivity',
  'airtable',
  'database',
  'airtable',
  true,
  true,
  true
) ON CONFLICT (integration_id) DO UPDATE SET
  is_completed = true,
  is_enabled = true;