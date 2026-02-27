UPDATE integrations 
SET is_enabled = true, is_completed = true 
WHERE integration_id IN ('checkout', 'circle', 'clarifai', 'claude', 'clearout', 'clickfunnels');