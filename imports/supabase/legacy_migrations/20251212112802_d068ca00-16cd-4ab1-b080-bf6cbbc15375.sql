-- Add active_integrations column to store integrations when conversation is created
ALTER TABLE ai_conversations 
ADD COLUMN active_integrations JSONB DEFAULT '[]'::jsonb;