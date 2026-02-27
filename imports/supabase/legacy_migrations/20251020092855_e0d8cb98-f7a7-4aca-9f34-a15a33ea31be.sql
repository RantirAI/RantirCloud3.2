-- Fix node_type and requires_installation for the 7 new nodes
UPDATE public.integrations
SET 
  node_type = integration_id,
  requires_installation = true,
  updated_at = now()
WHERE integration_id IN (
  'bamboohr',
  'bannerbear',
  'amplitude',
  'baserow',
  'beamer',
  'beehiiv',
  'bigin-by-zoho'
);