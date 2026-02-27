UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/constant-contact.png',
  flow_builder_instructions = '{"actions": ["createOrUpdateContact", "createCustomApiCall"]}'::jsonb
WHERE integration_id = 'constant-contact';