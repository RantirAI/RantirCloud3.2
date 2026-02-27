-- Ensure HubSpot integration exists in the integrations table
INSERT INTO public.integrations 
  (integration_id, name, description, icon, category, provider, version, node_type, requires_installation, is_enabled)
VALUES
  ('hubspot', 'HubSpot', 'Comprehensive HubSpot CRM integration for managing contacts, companies, deals, tickets, and more', 'https://cdn.botpress.cloud/integrations/hubspot/icon.png', 'Business Operations', 'botpress', '1.0.0', 'hubspot', true, true)
ON CONFLICT (integration_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  provider = EXCLUDED.provider,
  version = EXCLUDED.version,
  node_type = EXCLUDED.node_type,
  requires_installation = EXCLUDED.requires_installation,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = now();