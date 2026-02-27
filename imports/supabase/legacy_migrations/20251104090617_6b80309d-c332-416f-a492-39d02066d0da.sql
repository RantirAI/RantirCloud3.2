-- Update bitly integration to require installation
UPDATE integrations 
SET requires_installation = true
WHERE node_type = 'bitly';