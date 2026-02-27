-- Add theme customization columns to workspace_customization
ALTER TABLE public.workspace_customization 
ADD COLUMN IF NOT EXISTS theme_color text DEFAULT 'blue',
ADD COLUMN IF NOT EXISTS theme_font text DEFAULT 'Instrument Sans',
ADD COLUMN IF NOT EXISTS topbar_bg_color text DEFAULT 'default';