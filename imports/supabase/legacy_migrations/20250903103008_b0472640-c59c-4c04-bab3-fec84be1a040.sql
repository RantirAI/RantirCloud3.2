-- Update integration status for the nodes shown in the screenshot
UPDATE integrations 
SET is_completed = true, is_integrated = true, updated_at = now()
WHERE integration_id IN (
  'activecampaign',
  'activepieces', 
  'actualbudget',
  'acuity-scheduling',
  'acumbamail',
  'afforai'
);