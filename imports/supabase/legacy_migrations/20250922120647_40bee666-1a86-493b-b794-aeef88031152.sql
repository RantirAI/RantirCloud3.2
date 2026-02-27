-- Update integrations with their respective icon URLs
UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/aminos.png', updated_at = now()
WHERE integration_id = 'aminos';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/anyhook-graphql.png', updated_at = now()
WHERE integration_id = 'anyhook-graphql';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/apify.svg', updated_at = now()
WHERE integration_id = 'apify';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/apitable.png', updated_at = now()
WHERE integration_id = 'apitable';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/apitemplate-io.png', updated_at = now()
WHERE integration_id = 'apitemplate-io';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/approval.svg', updated_at = now()
WHERE integration_id = 'approval';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/ashby.png', updated_at = now()
WHERE integration_id = 'ashby';