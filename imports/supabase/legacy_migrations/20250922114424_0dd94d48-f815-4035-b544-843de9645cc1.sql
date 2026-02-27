-- Fix apify and apitemplate-io integrations by setting their node_type
UPDATE integrations 
SET node_type = 'apify', is_integrated = true, updated_at = now()
WHERE integration_id = 'apify';

UPDATE integrations 
SET node_type = 'apitemplate-io', is_integrated = true, updated_at = now()
WHERE integration_id = 'apitemplate-io';