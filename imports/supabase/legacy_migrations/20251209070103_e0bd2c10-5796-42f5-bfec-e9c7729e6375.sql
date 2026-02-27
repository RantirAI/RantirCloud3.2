UPDATE integrations 
SET 
  node_type = 'chatbase',
  requires_installation = true,
  is_enabled = true
WHERE integration_id = 'chatbase';