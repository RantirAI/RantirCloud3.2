-- Mark all 7 new integrations as completed so they're not "Coming Soon"
UPDATE public.integrations 
SET is_completed = true
WHERE integration_id IN ('twitter', 'slack', 'notion', 'google-calendar', 'woocommerce', 'assembled', 'assemblyai');