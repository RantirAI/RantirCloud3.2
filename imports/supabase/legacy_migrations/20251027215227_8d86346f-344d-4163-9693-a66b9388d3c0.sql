-- Add missing fields to documents table for settings persistence
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS width_mode text DEFAULT 'narrow' CHECK (width_mode IN ('narrow', 'full')),
ADD COLUMN IF NOT EXISTS show_page_breaks boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS header_content text,
ADD COLUMN IF NOT EXISTS footer_content text;