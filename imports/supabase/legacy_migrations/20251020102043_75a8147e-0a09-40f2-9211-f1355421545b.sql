-- Mark Bigin by Zoho integration as completed
UPDATE integrations 
SET is_completed = true, updated_at = now()
WHERE integration_id = 'bigin-by-zoho';