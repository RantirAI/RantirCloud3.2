-- Update Firecrawl integration with Activepieces logo URL
UPDATE integrations 
SET icon = 'https://cdn.activepieces.com/pieces/firecrawl.png'
WHERE integration_id = 'firecrawl';