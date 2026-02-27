-- Update node_type for integrations that were missing it
UPDATE integrations 
SET 
  node_type = CASE integration_id
    WHEN 'box' THEN 'box'
    WHEN 'browse-ai' THEN 'browse-ai'
    WHEN 'browserless' THEN 'browserless'
    WHEN 'bubble' THEN 'bubble'
  END,
  updated_at = now()
WHERE integration_id IN ('box', 'browse-ai', 'browserless', 'bubble')
  AND (node_type IS NULL OR node_type != integration_id);