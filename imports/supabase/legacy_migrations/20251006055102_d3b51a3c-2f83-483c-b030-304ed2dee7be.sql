-- Set up proper installation configs for each node
UPDATE public.integrations 
SET installation_config = CASE integration_id
  WHEN 'twitter' THEN '{"requiredFields": ["TWITTER_CONSUMER_KEY", "TWITTER_CONSUMER_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN_SECRET"], "setupInstructions": "Get your Twitter API credentials from the Twitter Developer Portal"}'::jsonb
  WHEN 'slack' THEN '{"requiredFields": ["SLACK_BOT_TOKEN"], "setupInstructions": "Create a Slack app and get your Bot User OAuth Token"}'::jsonb
  WHEN 'notion' THEN '{"requiredFields": ["NOTION_API_KEY"], "setupInstructions": "Create a Notion integration and get your API key"}'::jsonb
  WHEN 'google-calendar' THEN '{"requiredFields": ["GOOGLE_CALENDAR_ACCESS_TOKEN"], "setupInstructions": "Set up Google Calendar API and get an access token"}'::jsonb
  WHEN 'woocommerce' THEN '{"requiredFields": ["WOOCOMMERCE_URL", "WOOCOMMERCE_CONSUMER_KEY", "WOOCOMMERCE_CONSUMER_SECRET"], "setupInstructions": "Get your WooCommerce REST API credentials from your store settings"}'::jsonb
  WHEN 'assembled' THEN '{"requiredFields": ["ASSEMBLED_API_KEY"], "setupInstructions": "Get your Assembled API key from your account settings"}'::jsonb
  WHEN 'assemblyai' THEN '{"requiredFields": ["ASSEMBLYAI_API_KEY"], "setupInstructions": "Sign up for AssemblyAI and get your API key"}'::jsonb
END
WHERE integration_id IN ('twitter', 'slack', 'notion', 'google-calendar', 'woocommerce', 'assembled', 'assemblyai');