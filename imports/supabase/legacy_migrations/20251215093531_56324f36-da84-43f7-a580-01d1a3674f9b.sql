-- Add API key columns to published_apps for secure database connections
ALTER TABLE published_apps 
ADD COLUMN IF NOT EXISTS read_only_api_key_id uuid REFERENCES database_api_keys(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS api_key_prefix text,
ADD COLUMN IF NOT EXISTS data_connections jsonb DEFAULT '[]'::jsonb;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_published_apps_api_key ON published_apps(read_only_api_key_id);

-- Add comment for documentation
COMMENT ON COLUMN published_apps.read_only_api_key_id IS 'Reference to the auto-generated read-only API key for published app data access';
COMMENT ON COLUMN published_apps.api_key_prefix IS 'Prefix of the API key for display purposes (e.g., rdb_abc123...)';
COMMENT ON COLUMN published_apps.data_connections IS 'JSON array of database/table connections used by the app';