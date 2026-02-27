-- Update integration icons with proper URLs
UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/hubspot.png' 
WHERE integration_id = 'hubspot';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/activepieces.png' 
WHERE integration_id = 'activepieces';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/actualbudget.png' 
WHERE integration_id = 'actualbudget';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/acuity-scheduling.png' 
WHERE integration_id = 'acuity-scheduling';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/acumbamail.png' 
WHERE integration_id = 'acumbamail';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/afforai.png' 
WHERE integration_id = 'afforai';