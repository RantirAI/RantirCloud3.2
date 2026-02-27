-- Update logo URLs for the integration nodes
UPDATE public.integrations 
SET icon = CASE 
  WHEN node_type = 'brevo' THEN 'https://cdn.activepieces.com/pieces/brevo.png'
  WHEN node_type = 'amazon-sns' THEN 'https://cdn.activepieces.com/pieces/amazon-sns.png'
  WHEN node_type = 'amazon-s3' THEN 'https://cdn.activepieces.com/pieces/amazon-s3.png'
  WHEN node_type = 'airtop' THEN 'https://cdn.activepieces.com/pieces/airtop.png'
  WHEN node_type = 'amazon-sqs' THEN 'https://cdn.activepieces.com/pieces/aws-sqs.png'
END,
updated_at = now()
WHERE node_type IN ('brevo', 'amazon-sns', 'amazon-s3', 'airtop', 'amazon-sqs');