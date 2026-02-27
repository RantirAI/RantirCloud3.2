-- Add priority field to integrations table
ALTER TABLE public.integrations 
ADD COLUMN priority integer NOT NULL DEFAULT 0;

-- Create index for better performance when ordering by priority
CREATE INDEX IF NOT EXISTS integrations_priority_idx ON public.integrations(priority DESC, name ASC);