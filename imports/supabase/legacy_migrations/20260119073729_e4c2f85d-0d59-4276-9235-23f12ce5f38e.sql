UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/cognito-forms.png',
  flow_builder_instructions = jsonb_build_object('actions', ARRAY['createEntry', 'updateEntry', 'deleteEntry', 'getEntry', 'createCustomApiCallAction'])
WHERE integration_id = 'cognito-forms';

UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/cometapi.png',
  flow_builder_instructions = jsonb_build_object('actions', ARRAY['askCometApi', 'createCustomApiCall'])
WHERE integration_id = 'cometapi';

UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/comfyicu.png',
  flow_builder_instructions = jsonb_build_object('actions', ARRAY['getRunOutputAction', 'getRunStatusAction', 'listWorkflowsAction', 'submitWorkflowRunAction'])
WHERE integration_id = 'comfyicu';

UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/confluence.png',
  flow_builder_instructions = jsonb_build_object('actions', ARRAY['getPageContent', 'createPageFromTemplate'])
WHERE integration_id = 'confluence';

UPDATE integrations 
SET 
  icon = 'https://cdn.activepieces.com/pieces/connections.png',
  flow_builder_instructions = jsonb_build_object('actions', ARRAY['readConnection'])
WHERE integration_id = 'connections';