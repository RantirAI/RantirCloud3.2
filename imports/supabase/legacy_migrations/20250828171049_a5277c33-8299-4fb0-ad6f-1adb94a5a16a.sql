UPDATE integrations 
SET 
  requires_installation = true,
  is_enabled = true,
  is_completed = false,
  is_integrated = false,
  updated_at = now()
WHERE integration_id = 'google-docs';