-- Update integration status for the 7 new nodes to true
UPDATE integrations 
SET 
  is_integrated = true,
  is_enabled = true,
  is_completed = true
WHERE integration_id IN (
  'mailchimp-integration',
  'typeform-integration', 
  'zendesk-integration',
  'zoom-integration',
  'wordpress-integration',
  'gmail-integration',
  'stripe-integration'
) AND (
  is_integrated = false 
  OR is_integrated IS NULL 
  OR is_enabled = false 
  OR is_completed = false
);