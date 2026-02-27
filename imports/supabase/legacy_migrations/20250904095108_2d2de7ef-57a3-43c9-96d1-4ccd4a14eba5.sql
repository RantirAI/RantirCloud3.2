-- Add or update Firecrawl integration with proper logo URL
INSERT INTO integrations (
  integration_id, 
  name, 
  description, 
  icon, 
  category, 
  provider, 
  node_type, 
  is_enabled, 
  is_completed,
  priority
) VALUES (
  'firecrawl',
  'Firecrawl',
  'Scrape websites, crawl pages, and extract structured data with Firecrawl API',
  'https://firecrawl.dev/images/firecrawl_logo.png',
  'Data Sources',
  'firecrawl',
  'firecrawl',
  true,
  true,
  10
) ON CONFLICT (integration_id) 
DO UPDATE SET 
  icon = 'https://firecrawl.dev/images/firecrawl_logo.png',
  name = 'Firecrawl',
  description = 'Scrape websites, crawl pages, and extract structured data with Firecrawl API',
  category = 'Data Sources',
  provider = 'firecrawl',
  node_type = 'firecrawl',
  is_enabled = true,
  is_completed = true,
  priority = 10;