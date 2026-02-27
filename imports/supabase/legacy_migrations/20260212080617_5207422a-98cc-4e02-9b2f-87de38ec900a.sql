INSERT INTO public.integrations (
  integration_id, name, description, category, provider, node_type,
  requires_installation, is_completed, is_enabled, icon, priority
) VALUES (
  'resend',
  'Resend',
  'Send transactional emails using Resend API',
  'Productivity',
  'Rantir',
  'resend',
  true,
  true,
  true,
  'https://resend.com/static/brand/resend-icon-black.svg',
  0
);