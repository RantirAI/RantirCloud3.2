-- Update agentx icon URL in integrations table
UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/agentx.png'
WHERE integration_id = 'agentx';