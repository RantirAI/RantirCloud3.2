-- Insert Cal.com integration if it doesn't exist
INSERT INTO integrations (
  integration_id,
  name,
  description,
  category,
  provider,
  icon,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
)
SELECT
  'cal-com',
  'Cal.com',
  'Schedule and manage meetings with Cal.com',
  'productivity',
  'cal-com',
  'https://cal.com/logo.svg',
  'cal-com',
  true,
  true,
  true,
  100
WHERE NOT EXISTS (
  SELECT 1 FROM integrations WHERE integration_id = 'cal-com'
);

-- Insert Calendly integration if it doesn't exist
INSERT INTO integrations (
  integration_id,
  name,
  description,
  category,
  provider,
  icon,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
)
SELECT
  'calendly',
  'Calendly',
  'Manage scheduling and events with Calendly',
  'productivity',
  'calendly',
  'https://cdn.activepieces.com/pieces/calendly.png',
  'calendly',
  true,
  true,
  true,
  100
WHERE NOT EXISTS (
  SELECT 1 FROM integrations WHERE integration_id = 'calendly'
);

-- Insert CallRounded integration if it doesn't exist
INSERT INTO integrations (
  integration_id,
  name,
  description,
  category,
  provider,
  icon,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
)
SELECT
  'call-rounded',
  'CallRounded',
  'Manage voice calls and communication',
  'communication',
  'call-rounded',
  'https://cdn.activepieces.com/pieces/phone.png',
  'call-rounded',
  true,
  true,
  true,
  100
WHERE NOT EXISTS (
  SELECT 1 FROM integrations WHERE integration_id = 'call-rounded'
);

-- Insert Camb.ai integration if it doesn't exist
INSERT INTO integrations (
  integration_id,
  name,
  description,
  category,
  provider,
  icon,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
)
SELECT
  'camb-ai',
  'Camb.ai',
  'AI-powered conversation and content generation',
  'ai',
  'camb-ai',
  'https://cdn.activepieces.com/pieces/ai.png',
  'camb-ai',
  true,
  true,
  true,
  100
WHERE NOT EXISTS (
  SELECT 1 FROM integrations WHERE integration_id = 'camb-ai'
);

-- Insert Campaign Monitor integration if it doesn't exist
INSERT INTO integrations (
  integration_id,
  name,
  description,
  category,
  provider,
  icon,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
)
SELECT
  'campaign-monitor',
  'Campaign Monitor',
  'Email marketing and campaign management',
  'marketing',
  'campaign-monitor',
  'https://cdn.activepieces.com/pieces/campaign-monitor.png',
  'campaign-monitor',
  true,
  true,
  true,
  100
WHERE NOT EXISTS (
  SELECT 1 FROM integrations WHERE integration_id = 'campaign-monitor'
);

-- Insert Capsule CRM integration if it doesn't exist
INSERT INTO integrations (
  integration_id,
  name,
  description,
  category,
  provider,
  icon,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
)
SELECT
  'capsule-crm',
  'Capsule CRM',
  'Customer relationship management with Capsule',
  'crm',
  'capsule-crm',
  'https://cdn.activepieces.com/pieces/capsule-crm.png',
  'capsule-crm',
  true,
  true,
  true,
  100
WHERE NOT EXISTS (
  SELECT 1 FROM integrations WHERE integration_id = 'capsule-crm'
);