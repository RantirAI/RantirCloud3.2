-- Insert missing integrations
INSERT INTO integrations (integration_id, name, description, category, provider, is_completed, is_integrated, is_enabled, priority)
VALUES 
  ('clearoutphone', 'ClearoutPhone', 'Phone number verification and validation service', 'data', 'clearoutphone', true, true, true, 50),
  ('cloutly', 'Cloutly', 'Review management and reputation platform', 'marketing', 'cloutly', true, true, true, 50),
  ('clicdata', 'ClicData', 'Business intelligence and data visualization platform', 'analytics', 'clicdata', true, true, true, 50)
ON CONFLICT (integration_id) DO NOTHING;

-- Update existing integrations to completed and integrated
UPDATE integrations 
SET is_completed = true, is_integrated = true, updated_at = now()
WHERE integration_id IN ('cloudinary', 'coda', 'cody', 'clearoutphone', 'cloutly', 'clicdata');