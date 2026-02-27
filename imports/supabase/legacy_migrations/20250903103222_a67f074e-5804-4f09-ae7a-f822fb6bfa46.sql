-- Update loop node integration status to false
UPDATE integrations 
SET is_completed = false, is_integrated = false, updated_at = now()
WHERE node_type = 'loop-node' OR integration_id = 'loop-node';