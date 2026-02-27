-- Mark apify and apitemplate-io integrations as completed (no longer coming soon)
UPDATE integrations 
SET is_completed = true, updated_at = now()
WHERE integration_id IN ('apify', 'apitemplate-io');