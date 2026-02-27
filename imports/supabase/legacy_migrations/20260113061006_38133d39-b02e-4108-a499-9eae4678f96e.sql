-- Update icon URLs for the 6 integrations
UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/clearoutphone.png',
  updated_at = now()
WHERE integration_id = 'clearoutphone';

UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/cloudinary.png',
  updated_at = now()
WHERE integration_id = 'cloudinary';

UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/cloutly.svg',
  updated_at = now()
WHERE integration_id = 'cloutly';

UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/coda.png',
  updated_at = now()
WHERE integration_id = 'coda';

UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/cody.png',
  updated_at = now()
WHERE integration_id = 'cody';

UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/clicdata.png',
  updated_at = now()
WHERE integration_id = 'clicdata';