-- Add Apollo integration to the integrations table
INSERT INTO integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  version,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  is_integrated,
  priority,
  installation_config,
  flow_builder_instructions
) VALUES (
  'apollo',
  'Apollo',
  'Match persons and enrich companies using Apollo API for sales intelligence and prospecting',
  'https://cdn.activepieces.com/pieces/apollo.png',
  'Sales & Marketing',
  'Apollo.io',
  '1.0.0',
  'apollo',
  true,
  true,
  true,
  true,
  85,
  '{"apiKey": {"type": "text", "label": "Apollo API Key", "required": true, "description": "Your Apollo.io API key from your account settings"}}'::jsonb,
  '{"actions": ["match_person", "enrich_company", "search_people", "search_organizations"], "outputs": ["person", "organization", "people", "organizations", "total_count"], "categories": ["Sales Intelligence", "Lead Generation", "Data Enrichment"]}'::jsonb
);