-- Update integration status to true for apify and apitemplate-io
UPDATE integrations 
SET is_integrated = true, updated_at = now()
WHERE node_type IN ('apify', 'apitemplate-io');