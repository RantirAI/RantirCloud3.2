UPDATE integrations 
SET is_completed = true, is_integrated = true 
WHERE integration_id IN ('cognito-forms', 'cometapi', 'comfyicu', 'common', 'confluence', 'connections');