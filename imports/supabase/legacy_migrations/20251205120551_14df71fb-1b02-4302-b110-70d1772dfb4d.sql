-- Add snapshot_data column to ai_messages table for persistent flow state restoration
ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS snapshot_data JSONB;