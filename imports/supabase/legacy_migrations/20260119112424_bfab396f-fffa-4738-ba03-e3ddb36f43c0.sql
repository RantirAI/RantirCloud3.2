-- Fix Confluence integration - set node_type and enable it
UPDATE integrations 
SET node_type = 'confluence', 
    is_enabled = true,
    requires_installation = true
WHERE integration_id = 'confluence';

-- Fix Connections Manager - ensure it's installable
UPDATE integrations 
SET requires_installation = true,
    is_enabled = true
WHERE integration_id = 'connections';