-- Fix node_type for 4 integrations that have NULL node_type
UPDATE public.integrations 
SET node_type = integration_id 
WHERE integration_id IN ('contentful', 'convertkit', 'copper', 'copy-ai')
AND node_type IS NULL;