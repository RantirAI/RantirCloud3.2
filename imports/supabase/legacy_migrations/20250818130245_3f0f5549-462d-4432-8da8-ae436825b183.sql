-- Add integration tracking field to integrations table
ALTER TABLE integrations 
ADD COLUMN is_integrated BOOLEAN DEFAULT false;

-- Create an index for better performance when filtering by integration status
CREATE INDEX idx_integrations_is_integrated ON integrations(is_integrated);

-- Add a comment to document the field
COMMENT ON COLUMN integrations.is_integrated IS 'Tracks whether this integration has been implemented/integrated by developers';