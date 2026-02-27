-- Update HubSpot integration status to enabled
UPDATE public.integrations 
SET is_enabled = true, 
    updated_at = now()
WHERE integration_id = 'hubspot';