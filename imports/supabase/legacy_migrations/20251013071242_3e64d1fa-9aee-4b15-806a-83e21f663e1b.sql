-- Update integration status for the 7 new nodes
UPDATE integrations 
SET 
  is_integrated = true,
  is_completed = true,
  updated_at = now()
WHERE integration_id IN (
  'memberstack',
  'attio',
  'autocalls',
  'avoma',
  'azure-communication-services',
  'azure-openai',
  'backblaze'
);