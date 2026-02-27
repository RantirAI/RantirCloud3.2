-- Update node_type and other fields for the 7 new integrations to ensure they work properly
UPDATE public.integrations 
SET 
  node_type = CASE integration_id
    WHEN 'twitter' THEN 'twitter'
    WHEN 'slack' THEN 'slack'
    WHEN 'notion' THEN 'notion'
    WHEN 'google-calendar' THEN 'google-calendar'
    WHEN 'woocommerce' THEN 'woocommerce'
    WHEN 'assembled' THEN 'assembled'
    WHEN 'assemblyai' THEN 'assemblyai'
  END,
  requires_installation = true,
  is_enabled = true
WHERE integration_id IN ('twitter', 'slack', 'notion', 'google-calendar', 'woocommerce', 'assembled', 'assemblyai');