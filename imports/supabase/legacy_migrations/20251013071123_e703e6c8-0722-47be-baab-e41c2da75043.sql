-- Insert Memberstack integration
INSERT INTO integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
) VALUES (
  'memberstack',
  'Memberstack',
  'Manage members and authentication with Memberstack',
  'Users',
  'Authentication',
  'memberstack',
  'memberstack',
  true,
  true,
  true,
  50
);

-- Insert Attio integration
INSERT INTO integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
) VALUES (
  'attio',
  'Attio',
  'Manage contacts and records in Attio CRM',
  'Database',
  'CRM',
  'attio',
  'attio',
  true,
  true,
  true,
  50
);

-- Insert Autocalls integration
INSERT INTO integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
) VALUES (
  'autocalls',
  'Autocalls',
  'Make automated calls with Autocalls',
  'Phone',
  'Communication',
  'autocalls',
  'autocalls',
  true,
  true,
  true,
  50
);

-- Insert Avoma integration
INSERT INTO integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
) VALUES (
  'avoma',
  'Avoma',
  'Manage meeting recordings and transcriptions with Avoma',
  'Video',
  'Productivity',
  'avoma',
  'avoma',
  true,
  true,
  true,
  50
);

-- Insert Azure Communication Services integration
INSERT INTO integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
) VALUES (
  'azure-communication-services',
  'Azure Communication Services',
  'Send SMS and emails using Azure Communication Services',
  'MessageSquare',
  'Communication',
  'microsoft',
  'azure-communication-services',
  true,
  true,
  true,
  50
);

-- Insert Azure OpenAI integration
INSERT INTO integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
) VALUES (
  'azure-openai',
  'Azure OpenAI',
  'Use Azure OpenAI models for AI completions',
  'Brain',
  'AI',
  'microsoft',
  'azure-openai',
  true,
  true,
  true,
  50
);

-- Insert Backblaze B2 integration
INSERT INTO integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  node_type,
  requires_installation,
  is_enabled,
  is_completed,
  priority
) VALUES (
  'backblaze',
  'Backblaze B2',
  'Upload and manage files in Backblaze B2 storage',
  'HardDrive',
  'Storage',
  'backblaze',
  'backblaze',
  true,
  true,
  true,
  50
);