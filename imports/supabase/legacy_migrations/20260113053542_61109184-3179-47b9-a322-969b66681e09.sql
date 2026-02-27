-- Update integrations to set node_type and requires_installation for the 6 new nodes
UPDATE integrations 
SET 
  node_type = integration_id,
  requires_installation = true,
  updated_at = now()
WHERE integration_id IN ('clearoutphone', 'cloudinary', 'cloutly', 'coda', 'cody', 'clicdata');