UPDATE integrations 
SET 
  is_enabled = true,
  is_completed = true,
  is_integrated = true,
  updated_at = now()
WHERE integration_id = 'google-docs';