INSERT INTO integrations (
  integration_id,
  name,
  description,
  category,
  provider,
  icon,
  is_completed,
  is_enabled,
  is_integrated,
  priority,
  requires_installation,
  node_type,
  flow_builder_instructions
) VALUES (
  'constant-contact',
  'Constant Contact',
  'Email marketing and automation platform for creating campaigns, managing contacts, and tracking engagement.',
  'Marketing',
  'Constant Contact',
  'https://cdn.activepieces.com/pieces/constant-contact.png',
  true,
  true,
  true,
  1,
  true,
  'constant-contact',
  '{"actions": ["createContact", "updateContact", "deleteContact", "getContact", "listContacts", "createCampaign", "sendCampaign", "getCampaignStats"]}'::jsonb
);