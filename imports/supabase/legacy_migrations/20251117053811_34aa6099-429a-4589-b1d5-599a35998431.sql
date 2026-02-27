-- Fix Calendly integration settings to enable install/uninstall
UPDATE integrations 
SET 
  node_type = 'calendly',
  requires_installation = true,
  is_enabled = true
WHERE integration_id = 'calendly';