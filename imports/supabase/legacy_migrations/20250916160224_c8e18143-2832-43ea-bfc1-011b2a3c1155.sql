-- Update logo URL for Amazon SES integration
UPDATE public.integrations 
SET icon = 'https://cdn.activepieces.com/pieces/amazon-ses.png',
    updated_at = now()
WHERE node_type = 'amazon-ses';