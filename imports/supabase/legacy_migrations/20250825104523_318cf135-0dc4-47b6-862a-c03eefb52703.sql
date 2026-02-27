
-- Add Firecrawl integration to the catalog if it doesn't already exist
WITH ins AS (
  INSERT INTO public.integrations (
    integration_id,
    name,
    description,
    icon,
    category,
    provider,
    version,
    requires_installation,
    installation_config,
    flow_builder_instructions,
    is_enabled,
    is_completed,
    is_integrated,
    priority,
    node_type
  )
  SELECT
    'firecrawl' AS integration_id,
    'Firecrawl' AS name,
    'Crawl and scrape websites into structured content using the Firecrawl API.' AS description,
    NULL AS icon, -- optional: set a URL to an icon if you have one
    'Development' AS category,
    'mendable' AS provider,
    '1.0.0' AS version,
    TRUE AS requires_installation,
    '{
      "fields": [
        {
          "key": "api_key",
          "label": "Firecrawl API Key",
          "type": "secret",
          "required": true,
          "placeholder": "fc_live_...",
          "docsUrl": "https://docs.firecrawl.dev"
        }
      ],
      "secretsKeyName": "FIRECRAWL_API_KEY",
      "notes": "Store your Firecrawl API key as an Edge Function secret for server-side usage"
    }'::jsonb AS installation_config,
    '{
      "usage": "Provide api_key and choose an action: scrape single page, start crawl, get crawl status, or perform a custom API call. Fields dynamically adjust by action.",
      "nodeHints": {
        "api_key": "Use FIRECRAWL_API_KEY secret for server-side calls",
        "actions": ["scrape", "crawl", "crawl-status", "custom"]
      }
    }'::jsonb AS flow_builder_instructions,
    TRUE AS is_enabled,
    FALSE AS is_completed,
    TRUE AS is_integrated,
    50 AS priority,
    'firecrawl' AS node_type
  WHERE NOT EXISTS (
    SELECT 1 FROM public.integrations WHERE integration_id = 'firecrawl'
  )
  RETURNING id
)
SELECT id FROM ins;
