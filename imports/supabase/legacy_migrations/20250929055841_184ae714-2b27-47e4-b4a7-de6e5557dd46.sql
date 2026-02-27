-- Update icon URLs for the 7 integrations
UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/mailchimp.png'
WHERE integration_id = 'mailchimp-integration';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/gmail.png'
WHERE integration_id = 'gmail-integration';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/zoom.png'
WHERE integration_id = 'zoom-integration';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/wordpress.png'
WHERE integration_id = 'wordpress-integration';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/typeform.png'
WHERE integration_id = 'typeform-integration';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/zendesk.png'
WHERE integration_id = 'zendesk-integration';

UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/stripe.png'
WHERE integration_id = 'stripe-integration';