INSERT INTO integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  is_integrated,
  priority,
  "LongDescription",
  flow_builder_instructions
) VALUES (
  'google-docs',
  'Google Docs',
  'Create, read, edit and manage Google Docs documents',
  'FileText',
  'Productivity',
  'google',
  'google-docs',
  true,
  true,
  true,
  true,
  10,
  'Google Docs integration allows you to create documents, append text, find documents, read content, edit templates, and make custom API calls. Perfect for automating document workflows and content management.',
  '{
    "setup": [
      "Go to Google Cloud Console",
      "Create a new project or select existing one",
      "Enable Google Docs API",
      "Create OAuth2 credentials",
      "Configure authorized redirect URIs",
      "Copy Client ID and Client Secret"
    ],
    "authentication": "OAuth2",
    "scopes": [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive"
    ]
  }'::jsonb
);