
INSERT INTO integrations (integration_id, name, description, category, provider, node_type, requires_installation, is_completed, is_enabled, icon, version)
VALUES 
  ('chargekeep', 'ChargeKeep', 'Payment recovery and dunning management platform', 'Payments', 'ChargeKeep', 'chargekeep', true, true, true, 'https://cdn.activepieces.com/pieces/chargekeep.png', '1.0.0'),
  ('chat-aid', 'Chat Aid', 'AI-powered customer support chatbot platform', 'AI / Machine Learning', 'Chat Aid', 'chat-aid', true, true, true, 'https://cdn.activepieces.com/pieces/chat-aid.png', '1.0.0'),
  ('chat-data', 'Chat Data', 'Conversational data analytics and insights platform', 'AI / Machine Learning', 'Chat Data', 'chat-data', true, true, true, 'https://cdn.activepieces.com/pieces/chat-data.png', '1.0.0'),
  ('chatbase', 'Chatbase', 'Custom AI chatbot builder trained on your data', 'AI / Machine Learning', 'Chatbase', 'chatbase', true, true, true, 'https://cdn.activepieces.com/pieces/chatbase.png', '1.0.0'),
  ('chatnode', 'ChatNode', 'AI chatbot platform with knowledge base integration', 'AI / Machine Learning', 'ChatNode', 'chatnode', true, true, true, 'https://cdn.activepieces.com/pieces/chatnode.png', '1.0.0'),
  ('chatsistant', 'Chatsistant', 'AI assistant for automated customer conversations', 'AI / Machine Learning', 'Chatsistant', 'chatsistant', true, true, true, 'https://cdn.activepieces.com/pieces/chatsistant.png', '1.0.0')
ON CONFLICT (integration_id) DO NOTHING;
