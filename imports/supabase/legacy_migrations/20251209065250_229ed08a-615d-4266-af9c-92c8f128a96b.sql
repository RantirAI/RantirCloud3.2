
UPDATE integrations 
SET is_integrated = true, is_completed = true 
WHERE integration_id IN ('chargekeep', 'chat-aid', 'chat-data', 'chatbase', 'chatnode', 'chatsistant');
