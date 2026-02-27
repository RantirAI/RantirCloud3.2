INSERT INTO integrations (integration_id, name, description, category, provider, is_enabled, is_completed, node_type, icon, priority)
VALUES 
  ('checkout', 'Checkout.com', 'Payment processing and card issuing platform', 'Payments', 'Checkout.com', true, true, 'checkout', 'https://cdn.activepieces.com/pieces/checkout.png', 50),
  ('circle', 'Circle', 'Community platform for creators and brands', 'Community', 'Circle', true, true, 'circle', 'https://cdn.activepieces.com/pieces/circle.png', 50),
  ('clearout', 'Clearout', 'Email verification and validation service', 'Email', 'Clearout', true, true, 'clearout', 'https://cdn.activepieces.com/pieces/clearout.png', 50),
  ('clickfunnels', 'ClickFunnels', 'Sales funnel and landing page builder', 'Marketing', 'ClickFunnels', true, true, 'clickfunnels', 'https://cdn.activepieces.com/pieces/clickfunnels.png', 50)
ON CONFLICT (integration_id) DO NOTHING;