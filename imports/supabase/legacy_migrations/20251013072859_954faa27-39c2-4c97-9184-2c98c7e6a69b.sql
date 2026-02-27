-- Update logo URLs for the 7 new nodes in integrations table
UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/attio.png'
WHERE integration_id = 'attio';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/autocalls.png'
WHERE integration_id = 'autocalls';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/avoma.png'
WHERE integration_id = 'avoma';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/azure-communication-services.png'
WHERE integration_id = 'azure-communication-services';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/azure-openai.png'
WHERE integration_id = 'azure-openai';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/backblaze.png'
WHERE integration_id = 'backblaze';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/memberstack.png'
WHERE integration_id = 'memberstack';