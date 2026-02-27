INSERT INTO public.integrations 
  (integration_id, name, description, icon, category, provider, version, node_type, requires_installation, is_enabled)
VALUES
  ('hubspot', 'HubSpot', 'Comprehensive HubSpot CRM integration for managing contacts, companies, deals, tickets, and more', 'https://cdn.botpress.cloud/integrations/hubspot/icon.png', 'Business Operations', 'botpress', '1.0.0', 'hubspot', true, true)
ON CONFLICT (integration_id) DO NOTHING;