
-- Update DeepL with node_type
UPDATE integrations SET node_type = 'deepl', is_completed = true, is_enabled = true, provider = 'deepl' WHERE integration_id = 'deepl';

-- Update HelpScout with node_type
UPDATE integrations SET node_type = 'helpscout', is_completed = true, is_enabled = true, provider = 'helpscout' WHERE integration_id = 'helpscout';

-- Update HelpScout Trigger with node_type
UPDATE integrations SET node_type = 'helpscout-trigger', is_completed = true, is_enabled = true, provider = 'helpscout' WHERE integration_id = 'helpscout-trigger';

-- Insert DeepSeek if not exists
INSERT INTO integrations (integration_id, name, description, category, icon, node_type, provider, is_completed, is_enabled, priority)
VALUES (
  'deepseek',
  'DeepSeek',
  'DeepSeek is an advanced AI model provider offering powerful language models including DeepSeek V3 and DeepSeek R1 for chat completions and code generation tasks.',
  'LLMs / Gen AI',
  'https://upload.wikimedia.org/wikipedia/commons/e/ec/DeepSeek_logo.svg',
  'deepseek',
  'deepseek',
  true,
  true,
  50
)
ON CONFLICT (integration_id) DO UPDATE SET node_type = 'deepseek', is_completed = true, is_enabled = true;
