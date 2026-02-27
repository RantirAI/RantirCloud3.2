-- Update Bigin by Zoho integration status
UPDATE integrations 
SET is_integrated = true, updated_at = now()
WHERE integration_id = 'bigin-by-zoho';