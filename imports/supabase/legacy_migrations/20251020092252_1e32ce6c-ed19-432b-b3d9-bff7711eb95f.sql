-- Update integration status for the 7 new nodes
UPDATE public.integrations
SET 
  is_integrated = true,
  is_completed = true,
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
