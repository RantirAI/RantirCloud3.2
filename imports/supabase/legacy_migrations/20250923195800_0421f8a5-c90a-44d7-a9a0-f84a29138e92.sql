-- Update existing professional plan to user plan
UPDATE billing_plans 
SET code = 'user', name = 'User', price = 49.00
WHERE code = 'professional';

-- Update enterprise_pro to enterprise_lite
UPDATE billing_plans 
SET code = 'enterprise_lite', name = 'Enterprise Lite'
WHERE code = 'enterprise_pro';

-- Create enterprise_premium plan
INSERT INTO billing_plans (code, name, price, interval, features, is_enterprise, is_active)
VALUES (
  'enterprise_premium',
  'Enterprise Premium', 
  799.00,
  'monthly',
  '["Advanced analytics", "Custom integrations", "Priority support", "Advanced security", "Custom branding", "API access", "Dedicated account manager"]'::jsonb,
  true,
  true
);

-- Create enterprise plan
INSERT INTO billing_plans (code, name, price, interval, features, is_enterprise, is_active)
VALUES (
  'enterprise',
  'Enterprise', 
  3999.00,
  'monthly',
  '["All features", "Unlimited everything", "24/7 support", "Custom development", "On-premise deployment", "SLA guarantee", "Dedicated infrastructure"]'::jsonb,
  true,
  true
);