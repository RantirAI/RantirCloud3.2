-- Enable all 6 new nodes for installation
UPDATE public.integrations 
SET is_enabled = true 
WHERE integration_id IN ('contentful', 'contextual-ai', 'contiguity', 'convertkit', 'copper', 'copy-ai');