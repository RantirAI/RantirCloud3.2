INSERT INTO integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  version,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  is_integrated,
  priority
) VALUES (
  'google-sheets',
  'Google Sheets',
  'Connect to Google Sheets to read, write, and manage spreadsheet data',
  'https://developers.google.com/sheets/api/images/sheets-icon.png',
  'Productivity',
  'Google',
  '1.0.0',
  'google-sheets',
  true,
  true,
  false,
  false,
  5
) ON CONFLICT (integration_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  node_type = EXCLUDED.node_type,
  requires_installation = EXCLUDED.requires_installation;