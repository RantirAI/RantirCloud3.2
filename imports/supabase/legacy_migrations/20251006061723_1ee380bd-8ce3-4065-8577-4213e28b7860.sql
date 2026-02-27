-- Update icon URLs for the 7 new integrations
UPDATE public.integrations 
SET icon = CASE integration_id
  WHEN 'assembled' THEN 'https://cdn.activepieces.com/pieces/assembled.png'
  WHEN 'assemblyai' THEN 'https://cdn.activepieces.com/pieces/assemblyai.png'
  WHEN 'twitter' THEN 'https://cdn.activepieces.com/pieces/twitter.png'
  WHEN 'slack' THEN 'https://cdn.activepieces.com/pieces/slack.png'
  WHEN 'notion' THEN 'https://cdn.activepieces.com/pieces/notion.png'
  WHEN 'google-calendar' THEN 'https://cdn.activepieces.com/pieces/google-calendar.png'
  WHEN 'woocommerce' THEN 'https://cdn.activepieces.com/pieces/woocommerce.png'
END
WHERE integration_id IN ('assembled', 'assemblyai', 'twitter', 'slack', 'notion', 'google-calendar', 'woocommerce');