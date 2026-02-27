-- Add missing apify and apitemplate-io integrations
INSERT INTO integrations (integration_id, name, description, provider, category, node_type, is_integrated, requires_installation, priority) VALUES
('apify', 'Apify', 'Web scraping and automation platform for data extraction', 'Apify', 'automation', 'apify', true, true, 100),
('apitemplate-io', 'APITemplate.io', 'Generate images, PDFs, and videos from templates', 'APITemplate.io', 'media', 'apitemplate-io', true, true, 100)
ON CONFLICT (integration_id) DO UPDATE SET
  is_integrated = EXCLUDED.is_integrated,
  requires_installation = EXCLUDED.requires_installation;