-- Set requires_installation = true for all 6 new nodes
UPDATE public.integrations 
SET requires_installation = true 
WHERE integration_id IN ('contentful', 'contextual-ai', 'contiguity', 'convertkit', 'copper', 'copy-ai');