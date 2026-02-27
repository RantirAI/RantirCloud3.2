-- Add is_completed field to integrations table to track which integrations are ready
ALTER TABLE public.integrations 
ADD COLUMN is_completed boolean NOT NULL DEFAULT false;

-- Update Webflow integration to mark it as completed since it's ready
UPDATE public.integrations 
SET is_completed = true 
WHERE integration_id = 'webflow';