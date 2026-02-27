-- Update integration status to true for the 6 new nodes
UPDATE public.integrations 
SET is_integrated = true,
    updated_at = now()
WHERE node_type IN ('airtop', 'amazon-s3', 'amazon-ses', 'amazon-sns', 'amazon-sqs', 'brevo');