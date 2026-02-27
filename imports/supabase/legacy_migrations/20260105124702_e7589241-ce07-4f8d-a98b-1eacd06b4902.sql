-- Update existing integrations to link with node types
UPDATE integrations SET node_type = 'clicksend', requires_installation = true WHERE integration_id = 'clicksend-sms';
UPDATE integrations SET node_type = 'clickup', requires_installation = true WHERE integration_id = 'clickup';
UPDATE integrations SET node_type = 'clockify', requires_installation = true WHERE integration_id = 'clockify';

-- Insert missing integrations for clockodo, close, and cloudconvert
INSERT INTO integrations (integration_id, name, description, category, icon, provider, node_type, requires_installation, is_enabled)
VALUES 
  ('clockodo', 'Clockodo', 'Time tracking and project management for businesses', 'productivity', 'https://cdn.prod.website-files.com/67e18b84fa43974c4775c6ac/67f05cae53d1e17f85a391f9_677c7f361f055b94774f1e94_672ef8115feb40a3d6f29d6e_clockodo.png', 'Clockodo', 'clockodo', true, true),
  ('close-crm', 'Close CRM', 'Sales CRM built for growing teams', 'crm', 'https://cdn.prod.website-files.com/67e18b84fa43974c4775c6ac/67f05cae53d1e17f85a391f9_677c7f361f055b94774f1e94_672ef8115feb40a3d6f29d6e_clockodo.png', 'Close', 'close', true, true),
  ('cloudconvert', 'CloudConvert', 'File conversion service supporting 200+ formats', 'utilities', 'https://cdn.prod.website-files.com/67e18b84fa43974c4775c6ac/67f05cae53d1e17f85a391f9_677c7f361f055b94774f1e94_672ef8115feb40a3d6f29d6e_clockodo.png', 'CloudConvert', 'cloudconvert', true, true)
ON CONFLICT (integration_id) DO UPDATE SET 
  node_type = EXCLUDED.node_type,
  requires_installation = EXCLUDED.requires_installation;