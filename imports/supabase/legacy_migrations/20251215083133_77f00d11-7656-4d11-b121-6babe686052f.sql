-- Update the new nodes to require installation
UPDATE integrations 
SET requires_installation = true 
WHERE node_type IN ('checkout', 'circle', 'clarifai', 'claude', 'clearout', 'clickfunnels');