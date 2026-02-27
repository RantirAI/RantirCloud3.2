-- Update Shopify integration status to completed
UPDATE public.integrations 
SET 
  is_completed = true,
  is_enabled = true,
  updated_at = now()
WHERE integration_id = 'shopify';