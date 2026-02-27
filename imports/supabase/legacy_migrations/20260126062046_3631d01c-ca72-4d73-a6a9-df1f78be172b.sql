-- Update all 6 new integrations to have is_completed = true
UPDATE public.integrations 
SET is_completed = true 
WHERE integration_id IN ('contentful', 'contextual-ai', 'contiguity', 'convertkit', 'copper', 'copy-ai');