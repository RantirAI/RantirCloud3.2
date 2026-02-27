-- Insert missing integrations for the 6 new nodes
INSERT INTO integrations (integration_id, name, description, category, provider, icon, node_type, is_enabled, is_completed, requires_installation)
VALUES 
  ('cognito-forms', 'Cognito Forms', 'Create and manage forms with Cognito Forms API', 'productivity', 'Cognito Forms', 'FileText', 'cognito-forms', true, true, true),
  ('cometapi', 'CometAPI', 'Access CometAPI for AI and data processing', 'ai', 'CometAPI', 'Comet', 'cometapi', true, true, true),
  ('comfyicu', 'Comfy ICU', 'Run AI workflows with Comfy ICU', 'ai', 'Comfy ICU', 'Cpu', 'comfyicu', true, true, true),
  ('common', 'Common Utilities', 'Common utility functions for data manipulation and processing', 'utilities', 'System', 'Wrench', 'common', true, true, false),
  ('connections', 'Connections Manager', 'Manage and test API connections with various authentication methods', 'utilities', 'System', 'Link', 'connections', true, true, false)
ON CONFLICT (integration_id) DO NOTHING;