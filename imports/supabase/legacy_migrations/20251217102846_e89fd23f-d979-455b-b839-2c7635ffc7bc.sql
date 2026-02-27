-- Drop the restrictive CHECK constraint that only allows single values
-- This prevents saving comma-separated values like "database,flow" or "database,flow,app"
ALTER TABLE ai_conversations DROP CONSTRAINT IF EXISTS ai_conversations_page_context_check;