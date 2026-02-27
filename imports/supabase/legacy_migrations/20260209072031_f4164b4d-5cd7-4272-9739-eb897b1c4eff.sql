
INSERT INTO integrations (integration_id, name, description, category, provider, node_type, is_enabled, is_completed, requires_installation, priority)
VALUES
  ('customer-io', 'Customer.io', 'Marketing automation platform for targeted emails, push notifications, SMS, and in-app messages with customer event tracking', 'Channels', 'customer.io', 'customer-io', true, true, true, 50),
  ('customgpt', 'CustomGPT', 'Build and deploy custom AI chatbots trained on your own data with project management, conversations, and source ingestion', 'LLMs / Gen AI', 'customgpt', 'customgpt', true, true, true, 50),
  ('cyberark', 'CyberArk', 'Enterprise privileged access management for securely storing, retrieving, and rotating credentials and secrets', 'Development', 'cyberark', 'cyberark', true, true, true, 50),
  ('dappier', 'Dappier', 'Real-time AI-powered data recommendations, search, sports predictions, and stock analysis via specialized AI models', 'LLMs / Gen AI', 'dappier', 'dappier', true, true, true, 50),
  ('dashworks', 'Dashworks', 'AI knowledge assistant that searches across your connected apps and tools to answer questions instantly', 'Productivity', 'dashworks', 'dashworks', true, true, true, 50),
  ('data-mapper', 'Data Mapper', 'Server-side data transformation and mapping utility for field mapping, flattening, grouping, sorting, and custom transforms', 'Development', 'internal', 'data-mapper', true, true, true, 50)
ON CONFLICT (integration_id) DO NOTHING;
