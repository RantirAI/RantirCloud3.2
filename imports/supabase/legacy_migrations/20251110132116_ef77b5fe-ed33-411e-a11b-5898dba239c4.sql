-- Update the 6 new nodes to require installation
UPDATE integrations 
SET 
  requires_installation = true,
  updated_at = now()
WHERE integration_id IN ('box', 'brilliant-directories', 'browse-ai', 'browserless', 'bubble', 'bumpups');