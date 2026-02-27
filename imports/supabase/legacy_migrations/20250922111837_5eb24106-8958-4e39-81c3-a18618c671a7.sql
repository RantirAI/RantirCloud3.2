-- Insert integration records for the 7 new nodes
INSERT INTO integrations (
  integration_id,
  name,
  description,
  category,
  provider,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
) VALUES
(
  'aminos',
  'Aminos',
  'Connect to Aminos for amino acid and supplement data',
  'LLMs / Gen AI',
  'plus',
  'aminos',
  true,
  true,
  true,
  0
),
(
  'anyhook-graphql',
  'AnyHook GraphQL',
  'Execute GraphQL queries and mutations with AnyHook',
  'Development',
  'plus',
  'anyhook-graphql',
  true,
  true,
  true,
  0
),
(
  'apify',
  'Apify',
  'Web scraping and automation platform for data extraction',
  'Automation',
  'plus',
  'apify',
  true,
  true,
  true,
  0
),
(
  'apitable',
  'APITable',
  'Database and spreadsheet operations with APITable',
  'Productivity',
  'plus',
  'apitable',
  true,
  true,
  true,
  0
),
(
  'apitemplate-io',
  'APITemplate.io',
  'Generate documents, images, and PDFs from templates',
  'Productivity',
  'plus',
  'apitemplate-io',
  true,
  true,
  true,
  0
),
(
  'approval',
  'Approval',
  'Workflow approval and review processes',
  'Business Operations',
  'plus',
  'approval',
  true,
  true,
  true,
  0
),
(
  'ashby',
  'Ashby',
  'Talent management and recruiting platform integration',
  'Business Operations',
  'plus',
  'ashby',
  true,
  true,
  true,
  0
)
ON CONFLICT (integration_id) DO NOTHING;