INSERT INTO integrations (integration_id, name, description, icon, category, provider, node_type, is_completed, is_enabled, requires_installation, priority)
VALUES (
  'customer-io',
  'Customer.io',
  'Automated messaging platform for targeted emails, push notifications, and SMS',
  'https://cdn.activepieces.com/pieces/customer-io.png',
  'Automation',
  'customer.io',
  'customer-io',
  true,
  true,
  false,
  50
)
ON CONFLICT (integration_id) DO NOTHING;