-- Add is_initial_prompt column to ai_messages table
ALTER TABLE public.ai_messages 
ADD COLUMN IF NOT EXISTS is_initial_prompt boolean DEFAULT false;