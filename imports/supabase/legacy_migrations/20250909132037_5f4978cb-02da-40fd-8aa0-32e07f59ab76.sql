-- Update existing integrations to be proper node integrations
UPDATE integrations 
SET 
  node_type = integration_id,
  requires_installation = true,
  is_enabled = true
WHERE integration_id IN ('airparser', 'trello', 'asana');