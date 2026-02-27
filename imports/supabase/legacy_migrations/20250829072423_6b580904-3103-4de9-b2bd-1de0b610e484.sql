-- Update HubSpot integration to mark it as completed and available
UPDATE public.integrations 
SET is_completed = true,
    updated_at = now()
WHERE integration_id = 'hubspot';