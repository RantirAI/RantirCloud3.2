-- Update clarifai and claude to have their node_type set
UPDATE integrations 
SET node_type = 'clarifai', icon = 'https://cdn.activepieces.com/pieces/clarifai.png'
WHERE integration_id = 'clarifai';

UPDATE integrations 
SET node_type = 'claude', icon = 'https://cdn.activepieces.com/pieces/claude.png'
WHERE integration_id = 'claude';