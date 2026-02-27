-- Insert missing integration records for Amplitude, Beamer, and Bigin by Zoho
INSERT INTO public.integrations (
  integration_id,
  name,
  description,
  provider,
  category,
  icon,
  requires_installation,
  is_completed,
  is_enabled,
  node_type
) VALUES
  (
    'amplitude',
    'Amplitude',
    'Track product analytics and user behavior',
    'Amplitude',
    'Analytics',
    'BarChart3',
    true,
    true,
    true,
    'amplitude'
  ),
  (
    'beamer',
    'Beamer',
    'Product updates and changelog management',
    'Beamer',
    'Communication',
    'Megaphone',
    true,
    true,
    true,
    'beamer'
  ),
  (
    'beehiiv',
    'beehiiv',
    'Newsletter platform for creators',
    'beehiiv',
    'Marketing',
    'Mail',
    true,
    true,
    true,
    'beehiiv'
  )
ON CONFLICT (integration_id) DO UPDATE SET
  is_completed = EXCLUDED.is_completed,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = now();