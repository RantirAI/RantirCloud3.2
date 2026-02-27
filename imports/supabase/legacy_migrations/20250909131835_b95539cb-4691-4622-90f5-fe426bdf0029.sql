-- Add missing node integrations for airparser, trello, and asana
INSERT INTO integrations (
  id, 
  name, 
  description, 
  icon, 
  category, 
  provider, 
  node_type, 
  requires_installation, 
  is_completed, 
  enabled
) VALUES 
(
  gen_random_uuid(),
  'Airparser',
  'Extract structured data from emails, PDFs, images, and HTML with AI-powered parsing',
  'https://cdn.activepieces.com/pieces/airparser.png',
  'Automation',
  'airparser',
  'airparser',
  true,
  true,
  true
),
(
  gen_random_uuid(),
  'Trello',
  'Manage boards, lists, and cards in your Trello workspace',
  'https://cdn.activepieces.com/pieces/trello.png',
  'Productivity',
  'trello',
  'trello',
  true,
  true,
  true
),
(
  gen_random_uuid(),
  'Asana',
  'Create and manage tasks, projects, and teams in Asana',
  'https://cdn.activepieces.com/pieces/asana.png',
  'Productivity',
  'asana',
  'asana',
  true,
  true,
  true
);