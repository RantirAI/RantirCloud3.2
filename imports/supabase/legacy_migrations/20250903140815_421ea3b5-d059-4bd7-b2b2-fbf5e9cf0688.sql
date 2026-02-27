-- Update integrations table to support node types and add node integrations
-- First, rename botpress_integrations to integrations if it doesn't exist
DO $$
BEGIN
    -- Check if integrations table already exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'integrations' AND table_schema = 'public') THEN
        -- Rename botpress_integrations to integrations
        ALTER TABLE public.botpress_integrations RENAME TO integrations;
    END IF;
END
$$;

-- Add node_type column and other necessary columns for node integrations
ALTER TABLE public.integrations 
ADD COLUMN IF NOT EXISTS node_type TEXT,
ADD COLUMN IF NOT EXISTS requires_installation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS installation_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- Update user_integrations to reference the integrations table (if it was renamed)
DO $$
BEGIN
    -- Check if the foreign key constraint exists and update it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_integrations_integration_id_fkey' 
        AND table_name = 'user_integrations'
    ) THEN
        ALTER TABLE public.user_integrations 
        DROP CONSTRAINT user_integrations_integration_id_fkey,
        ADD CONSTRAINT user_integrations_integration_id_fkey 
        FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Insert node integrations including Airtable
INSERT INTO public.integrations 
  (integration_id, name, description, icon, category, provider, version, node_type, requires_installation, is_completed)
VALUES
  -- Airtable integration
  ('airtable', 'Airtable', 'Connect to Airtable to manage your data and records across bases and tables', 'https://cdn.activepieces.com/pieces/airtable.png', 'Productivity', 'activepieces', '1.0.0', 'airtable', true, true),
  
  -- Other node integrations
  ('webflow', 'Webflow', 'Connect to Webflow to manage your website content and collections', 'https://cdn.activepieces.com/pieces/webflow.png', 'Productivity', 'activepieces', '1.0.0', 'webflow', true, true),
  ('firecrawl', 'Firecrawl', 'Web scraping and crawling service for extracting structured data', 'https://cdn.activepieces.com/pieces/firecrawl.png', 'Development', 'activepieces', '1.0.0', 'firecrawl', true, true),
  ('snowflake', 'Snowflake', 'Connect to Snowflake data warehouse for analytics and data operations', 'https://cdn.activepieces.com/pieces/snowflake.png', 'Analytics', 'activepieces', '1.0.0', 'snowflake', true, true),
  ('shopify', 'Shopify', 'Connect to Shopify to manage your e-commerce store operations', 'https://cdn.activepieces.com/pieces/shopify.png', 'Business Operations', 'activepieces', '1.0.0', 'shopify', true, true),
  ('salesforce', 'Salesforce', 'Connect to Salesforce CRM for customer relationship management', 'https://cdn.activepieces.com/pieces/salesforce.png', 'Business Operations', 'activepieces', '1.0.0', 'salesforce', true, true),
  ('google-docs', 'Google Docs', 'Create and manage Google Docs documents', 'https://cdn.activepieces.com/pieces/google-docs.png', 'Productivity', 'activepieces', '1.0.0', 'google-docs', true, true),
  ('google-sheets', 'Google Sheets', 'Create and manage Google Sheets spreadsheets', 'https://cdn.activepieces.com/pieces/google-sheets.png', 'Productivity', 'activepieces', '1.0.0', 'google-sheets', true, true),
  ('hubspot', 'HubSpot', 'Connect to HubSpot CRM and marketing automation platform', 'https://cdn.activepieces.com/pieces/hubspot.png', 'Business Operations', 'activepieces', '1.0.0', 'hubspot', true, true),
  ('apollo', 'Apollo', 'Connect to Apollo for sales intelligence and lead generation', 'https://cdn.activepieces.com/pieces/apollo.png', 'Business Operations', 'activepieces', '1.0.0', 'apollo', true, true),
  ('activecampaign', 'ActiveCampaign', 'Connect to ActiveCampaign for email marketing automation', 'https://cdn.activepieces.com/pieces/activecampaign.png', 'Business Operations', 'activepieces', '1.0.0', 'activecampaign', true, true),
  ('activepieces', 'Activepieces', 'Connect to Activepieces automation platform', 'https://cdn.activepieces.com/pieces/activepieces.png', 'Automation', 'activepieces', '1.0.0', 'activepieces', true, true),
  ('actualbudget', 'Actual Budget', 'Connect to Actual Budget for personal finance management', 'https://cdn.activepieces.com/pieces/actualbudget.png', 'Business Operations', 'activepieces', '1.0.0', 'actualbudget', true, true),
  ('acuity-scheduling', 'Acuity Scheduling', 'Connect to Acuity Scheduling for appointment management', 'https://cdn.activepieces.com/pieces/acuity-scheduling.png', 'Business Operations', 'activepieces', '1.0.0', 'acuity-scheduling', true, true),
  ('acumbamail', 'Acumbamail', 'Connect to Acumbamail for email marketing', 'https://cdn.activepieces.com/pieces/acumbamail.png', 'Business Operations', 'activepieces', '1.0.0', 'acumbamail', true, true),
  ('afforai', 'Afforai', 'Connect to Afforai AI platform for document analysis', 'https://cdn.activepieces.com/pieces/afforai.png', 'LLMs / Gen AI', 'activepieces', '1.0.0', 'afforai', true, true)
ON CONFLICT (integration_id) DO UPDATE SET
  node_type = EXCLUDED.node_type,
  requires_installation = EXCLUDED.requires_installation,
  is_completed = EXCLUDED.is_completed;

-- Create index for node_type lookups
CREATE INDEX IF NOT EXISTS integrations_node_type_idx ON public.integrations(node_type);

-- Update RLS policies for the integrations table
DROP POLICY IF EXISTS botpress_integrations_read_policy ON public.integrations;
CREATE POLICY integrations_read_policy
  ON public.integrations
  FOR SELECT
  TO authenticated
  USING (true);