-- Add Salesforce integration
INSERT INTO public.integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  version,
  is_enabled,
  requires_installation,
  is_completed,
  is_integrated,
  priority,
  node_type,
  LongDescription,
  installation_config,
  flow_builder_instructions
) VALUES (
  'salesforce',
  'Salesforce',
  'Connect to Salesforce API for CRUD operations, queries, and bulk data management',
  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/salesforce/salesforce-original.svg',
  'Business Operations',
  'salesforce',
  '1.0.0',
  true,
  true,
  true,
  true,
  80,
  'salesforce',
  'Comprehensive Salesforce integration that supports SOQL queries, CRUD operations, batch processing, and bulk data management. Connect using predefined credentials or custom connection settings with support for both production and sandbox environments.',
  '{
    "authType": "oauth2",
    "scopes": ["api", "refresh_token", "offline_access"],
    "environments": ["production", "sandbox"],
    "customConnection": true
  }'::jsonb,
  '{
    "supportedOperations": [
      "run_query",
      "create_object", 
      "update_object",
      "batch_upsert",
      "bulk_upsert",
      "custom_api"
    ],
    "fieldMapping": true,
    "environmentSelection": true,
    "customCredentials": true
  }'::jsonb
) ON CONFLICT (integration_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  provider = EXCLUDED.provider,
  version = EXCLUDED.version,
  is_enabled = EXCLUDED.is_enabled,
  requires_installation = EXCLUDED.requires_installation,
  is_completed = EXCLUDED.is_completed,
  is_integrated = EXCLUDED.is_integrated,
  priority = EXCLUDED.priority,
  node_type = EXCLUDED.node_type,
  LongDescription = EXCLUDED.LongDescription,
  installation_config = EXCLUDED.installation_config,
  flow_builder_instructions = EXCLUDED.flow_builder_instructions,
  updated_at = now();