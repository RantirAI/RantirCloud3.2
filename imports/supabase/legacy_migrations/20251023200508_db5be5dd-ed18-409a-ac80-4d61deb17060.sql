-- Add logo field to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS logo text;