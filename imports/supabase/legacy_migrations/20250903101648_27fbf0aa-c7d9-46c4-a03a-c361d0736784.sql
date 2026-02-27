-- Add missing node integrations to the integrations table
INSERT INTO integrations (
  integration_id, name, description, icon, category, provider, 
  requires_installation, node_type, is_completed, is_enabled
) VALUES 
-- Activepieces
('activepieces', 'Activepieces', 'Open-source automation platform for building workflows', 'activepieces', 'Automation', 'activepieces', true, 'activepieces', false, true),

-- Actual Budget
('actualbudget', 'Actual Budget', 'Local-first personal finance tool for budget management', 'actualbudget', 'Business Operations', 'actualbudget', true, 'actualbudget', false, true),

-- Acuity Scheduling
('acuity-scheduling', 'Acuity Scheduling', 'Online appointment scheduling software', 'acuity', 'Business Operations', 'acuity', true, 'acuity-scheduling', false, true),

-- Acumbamail
('acumbamail', 'Acumbamail', 'Email marketing and automation platform', 'acumbamail', 'Productivity', 'acumbamail', true, 'acumbamail', false, true),

-- Afforai
('afforai', 'Afforai', 'AI-powered research assistant and document analysis tool', 'afforai', 'LLMs / Gen AI', 'afforai', true, 'afforai', false, true);

-- Update existing ActiveCampaign to include node_type
UPDATE integrations 
SET node_type = 'activecampaign'
WHERE integration_id = 'activecampaign' AND node_type IS NULL;