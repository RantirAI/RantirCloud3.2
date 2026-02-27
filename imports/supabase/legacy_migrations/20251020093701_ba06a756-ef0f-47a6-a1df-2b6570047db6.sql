-- Mark the 7 new nodes as completed/implemented
UPDATE public.integrations
SET 
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