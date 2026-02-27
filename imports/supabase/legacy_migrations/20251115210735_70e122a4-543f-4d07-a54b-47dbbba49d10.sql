-- Add page_size column to documents table
ALTER TABLE documents 
ADD COLUMN page_size text DEFAULT 'a4';

-- Add a comment to describe the column
COMMENT ON COLUMN documents.page_size IS 'Document page size format (a4, letter, slides-16-9, etc.)';