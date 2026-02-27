-- Enable the 4 integrations that were marked as completed but not enabled
UPDATE public.integrations
SET 
  is_enabled = true,
  updated_at = now()
WHERE integration_id IN (
  'bamboohr',
  'amplitude',
  'beamer',
  'bigin-by-zoho'
);