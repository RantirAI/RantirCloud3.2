-- Update agentx and aianswer to require installation
UPDATE integrations 
SET requires_installation = true
WHERE integration_id IN ('agentx', 'aianswer');