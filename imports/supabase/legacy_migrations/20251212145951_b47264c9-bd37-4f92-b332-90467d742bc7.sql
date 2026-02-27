-- Add model column to ai_messages table to persist AI model name
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS model TEXT;