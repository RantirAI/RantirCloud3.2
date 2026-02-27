-- Add signature verification configuration columns to flow_projects
ALTER TABLE public.flow_projects
ADD COLUMN IF NOT EXISTS signature_provider text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS signature_header_name text,
ADD COLUMN IF NOT EXISTS signature_algorithm text DEFAULT 'sha256',
ADD COLUMN IF NOT EXISTS external_webhook_secret text,
ADD COLUMN IF NOT EXISTS signature_timestamp_tolerance integer DEFAULT 300;

-- Add comment for documentation
COMMENT ON COLUMN public.flow_projects.signature_provider IS 'Signature verification provider: none, generic, webflow, stripe, github, shopify, custom';
COMMENT ON COLUMN public.flow_projects.signature_header_name IS 'Custom header name for signature (e.g., X-Webflow-Signature)';
COMMENT ON COLUMN public.flow_projects.signature_algorithm IS 'Signature algorithm: sha256, sha1, stripe_v1';
COMMENT ON COLUMN public.flow_projects.external_webhook_secret IS 'Secret key from external platform for signature verification';
COMMENT ON COLUMN public.flow_projects.signature_timestamp_tolerance IS 'Timestamp tolerance in seconds for Stripe-style verification';