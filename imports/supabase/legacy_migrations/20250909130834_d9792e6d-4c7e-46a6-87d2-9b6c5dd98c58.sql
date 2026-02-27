-- Update integration status to true for all 6 nodes
UPDATE integrations 
SET is_integrated = true 
WHERE integration_id IN ('agentx', 'aianswer', 'aircall', 'airparser', 'trello', 'asana');