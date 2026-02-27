-- Add INSERT policy for integrations table
CREATE POLICY "Authenticated users can insert integrations"
ON integrations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Insert the 6 new integration records
INSERT INTO integrations (
  integration_id,
  name,
  description,
  icon,
  category,
  provider,
  node_type,
  requires_installation,
  is_completed,
  is_integrated,
  priority
) VALUES 
  ('box', 'Box', 'Interact with Box cloud storage - upload, download, and manage files', 'Package', 'Storage', 'Box', 'box', true, true, true, 100),
  ('brilliant-directories', 'Brilliant Directories', 'Manage directory and membership sites with Brilliant Directories', 'BookOpen', 'Website Builder', 'Brilliant Directories', 'brilliant-directories', true, true, true, 100),
  ('browse-ai', 'Browse AI', 'Extract data from any website using Browse AI web scraping', 'Search', 'Web Scraping', 'Browse AI', 'browse-ai', true, true, true, 100),
  ('browserless', 'Browserless', 'Headless browser automation for screenshots, PDFs, and web scraping', 'Globe', 'Automation', 'Browserless', 'browserless', true, true, true, 100),
  ('bubble', 'Bubble', 'Connect to Bubble.io no-code platform via Data API', 'Sparkles', 'No-Code Platform', 'Bubble', 'bubble', true, true, true, 100),
  ('bumpups', 'BumpUps', 'Automate listings promotion and management on marketplaces', 'TrendingUp', 'Marketing', 'BumpUps', 'bumpups', true, true, true, 100)
ON CONFLICT (integration_id) DO UPDATE
SET 
  is_completed = true,
  is_integrated = true,
  updated_at = now();