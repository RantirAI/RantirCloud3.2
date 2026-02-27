-- Insert integration records for the missing nodes
INSERT INTO integrations (integration_id, name, description, icon, category, provider, node_type, requires_installation, is_enabled, is_completed) VALUES
('agentx', 'AgentX', 'AI-powered agent for automated task execution', 'https://cdn.activepieces.com/pieces/activepieces.png', 'LLMs / Gen AI', 'agentx', 'agentx', false, true, true),
('aianswer', 'AI Answer', 'Generate intelligent answers using AI models', 'https://cdn.activepieces.com/pieces/aianswer.png', 'LLMs / Gen AI', 'aianswer', 'aianswer', false, true, true),
('aircall', 'Aircall', 'Cloud-based call center software integration', 'https://cdn.activepieces.com/pieces/aircall.png', 'Channels', 'aircall', 'aircall', true, true, true);