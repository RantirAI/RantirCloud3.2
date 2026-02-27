-- Insert 5 new integrations (captain-data, cartloom, cashfree-payments, certopus, chainalysis-api)
INSERT INTO integrations (integration_id, name, description, category, icon, provider, requires_installation, is_enabled, is_completed, is_integrated, node_type, priority)
VALUES 
  ('captain-data', 'Captain Data', 'Automate data extraction and enrichment workflows from web sources', 'Data', 'https://cdn.activepieces.com/pieces/captain-data.png', 'Captain Data', true, true, true, true, 'captain-data', 100),
  ('cartloom', 'Cartloom', 'E-commerce shopping cart and order management platform', 'E-Commerce', 'https://cdn.activepieces.com/pieces/cartloom.png', 'Cartloom', true, true, true, true, 'cartloom', 100),
  ('cashfree-payments', 'Cashfree Payments', 'Payment gateway for India - process payments, refunds, and payouts', 'Finance', 'https://cdn.activepieces.com/pieces/cashfree.png', 'Cashfree', true, true, true, true, 'cashfree-payments', 100),
  ('certopus', 'Certopus', 'Generate and manage digital certificates and credentials', 'Productivity', 'https://cdn.activepieces.com/pieces/certopus.png', 'Certopus', true, true, true, true, 'certopus', 100),
  ('chainalysis-api', 'Chainalysis API', 'Blockchain analytics and compliance - screen addresses and transactions', 'Crypto', 'https://cdn.activepieces.com/pieces/chainalysis.png', 'Chainalysis', true, true, true, true, 'chainalysis-api', 100)
ON CONFLICT (integration_id) DO NOTHING;

-- Update existing chaindesk record to enable it as a node
UPDATE integrations 
SET node_type = 'chaindesk', 
    requires_installation = true, 
    is_enabled = true, 
    is_completed = true, 
    is_integrated = true, 
    priority = 100
WHERE integration_id = 'chaindesk';