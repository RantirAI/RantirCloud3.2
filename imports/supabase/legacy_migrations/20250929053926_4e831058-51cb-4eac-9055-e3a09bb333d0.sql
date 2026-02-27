-- Insert integration records for the new nodes
INSERT INTO integrations (
  integration_id, 
  name, 
  description, 
  category, 
  icon, 
  provider, 
  node_type, 
  requires_installation, 
  is_completed,
  priority
) VALUES 
(
  'mailchimp-integration',
  'Mailchimp',
  'Email marketing automation and audience management',
  'Channels',
  'Mail',
  'mailchimp',
  'mailchimp',
  true,
  true,
  10
),
(
  'typeform-integration',
  'Typeform',
  'Interactive forms and surveys',
  'Productivity',
  'FileText',
  'typeform',
  'typeform',
  true,
  true,
  10
),
(
  'zendesk-integration',
  'Zendesk',
  'Customer support and ticketing system',
  'Support',
  'Headphones',
  'zendesk',
  'zendesk',
  true,
  true,
  10
),
(
  'zoom-integration',
  'Zoom',
  'Video conferencing and meeting management',
  'Productivity',
  'Video',
  'zoom',
  'zoom',
  true,
  true,
  10
),
(
  'wordpress-integration',
  'WordPress',
  'Content management and publishing',
  'Business Operations',
  'Globe',
  'wordpress',
  'wordpress',
  true,
  true,
  10
),
(
  'gmail-integration',
  'Gmail',
  'Email sending and management',
  'Channels',
  'Mail',
  'gmail',
  'gmail',
  true,
  true,
  10
),
(
  'stripe-integration',
  'Stripe',
  'Payment processing and subscription management',
  'Business Operations',
  'CreditCard',
  'stripe',
  'stripe',
  true,
  true,
  10
);