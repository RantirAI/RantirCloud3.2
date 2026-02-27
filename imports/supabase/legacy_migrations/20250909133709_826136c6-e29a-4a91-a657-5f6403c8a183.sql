-- Add missing integrations for airparser, asana, and trello
INSERT INTO integrations (integration_id, name, description, icon, category, provider, node_type, requires_installation, is_enabled, is_completed) 
VALUES 
  ('airparser', 'Airparser', 'Extract structured data from emails and documents using AI', 'https://cdn.activepieces.com/pieces/airparser.png', 'Productivity', 'activepieces', 'airparser', true, true, true),
  ('asana', 'Asana', 'Project management and team collaboration platform', 'https://cdn.activepieces.com/pieces/asana.png', 'Productivity', 'activepieces', 'asana', true, true, true),
  ('trello', 'Trello', 'Visual project management with boards, lists, and cards', 'https://cdn.activepieces.com/pieces/trello.png', 'Productivity', 'activepieces', 'trello', true, true, true)
ON CONFLICT (integration_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  provider = EXCLUDED.provider,
  node_type = EXCLUDED.node_type,
  requires_installation = EXCLUDED.requires_installation,
  is_enabled = EXCLUDED.is_enabled,
  is_completed = EXCLUDED.is_completed;