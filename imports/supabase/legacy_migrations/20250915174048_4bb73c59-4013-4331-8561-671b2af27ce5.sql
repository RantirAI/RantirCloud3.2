-- Add the 6 new node integrations to the integrations table
INSERT INTO public.integrations 
  (integration_id, name, description, icon, category, provider, version, node_type, requires_installation, is_completed, is_enabled)
VALUES
  ('airtop', 'Airtop', 'Automate browser tasks using Airtop AI-powered browser automation', '/placeholder.svg', 'Automation', 'Rantir', '1.0.0', 'airtop', true, true, true),
  ('amazon-s3', 'Amazon S3', 'Store and retrieve files from Amazon S3 buckets', '/placeholder.svg', 'Business Operations', 'Rantir', '1.0.0', 'amazon-s3', true, true, true),
  ('amazon-ses', 'Amazon SES', 'Send emails using Amazon Simple Email Service', '/placeholder.svg', 'Business Operations', 'Rantir', '1.0.0', 'amazon-ses', true, true, true),
  ('amazon-sns', 'Amazon SNS', 'Send notifications using Amazon Simple Notification Service', '/placeholder.svg', 'Business Operations', 'Rantir', '1.0.0', 'amazon-sns', true, true, true),
  ('amazon-sqs', 'Amazon SQS', 'Send and receive messages using Amazon Simple Queue Service', '/placeholder.svg', 'Business Operations', 'Rantir', '1.0.0', 'amazon-sqs', true, true, true),
  ('brevo', 'Brevo', 'Send emails and manage contacts using Brevo (formerly Sendinblue)', '/placeholder.svg', 'Business Operations', 'Rantir', '1.0.0', 'brevo', true, true, true)
ON CONFLICT (integration_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  node_type = EXCLUDED.node_type,
  requires_installation = EXCLUDED.requires_installation,
  is_completed = EXCLUDED.is_completed,
  is_enabled = EXCLUDED.is_enabled;