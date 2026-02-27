-- Update integration status to show them as available
UPDATE public.integrations 
SET is_integrated = true
WHERE integration_id IN ('twitter', 'slack', 'notion', 'google-calendar', 'woocommerce', 'assembled', 'assemblyai');