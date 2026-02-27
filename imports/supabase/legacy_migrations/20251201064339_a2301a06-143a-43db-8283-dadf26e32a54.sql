-- Update icon URLs for the 6 integrations
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/captain-data.png' WHERE integration_id = 'captain-data';
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/cartloom.png' WHERE integration_id = 'cartloom';
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/certopus.png' WHERE integration_id = 'certopus';
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/chainalysis-api.jpg' WHERE integration_id = 'chainalysis-api';
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/chaindesk.png' WHERE integration_id = 'chaindesk';
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/cashfree-payments.png' WHERE integration_id = 'cashfree-payments';