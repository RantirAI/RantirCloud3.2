-- Add deployment columns to flow_projects
ALTER TABLE flow_projects ADD COLUMN IF NOT EXISTS is_deployed boolean DEFAULT false;
ALTER TABLE flow_projects ADD COLUMN IF NOT EXISTS endpoint_slug text UNIQUE;
ALTER TABLE flow_projects ADD COLUMN IF NOT EXISTS webhook_secret text;
ALTER TABLE flow_projects ADD COLUMN IF NOT EXISTS deployment_status text DEFAULT 'draft';
ALTER TABLE flow_projects ADD COLUMN IF NOT EXISTS last_deployed_at timestamptz;
ALTER TABLE flow_projects ADD COLUMN IF NOT EXISTS deployed_version integer;

-- Create flow_endpoints table for advanced routing
CREATE TABLE IF NOT EXISTS flow_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_project_id uuid REFERENCES flow_projects(id) ON DELETE CASCADE,
  endpoint_type text NOT NULL CHECK (endpoint_type IN ('webhook', 'api', 'scheduled')),
  http_method text DEFAULT 'POST',
  path_suffix text,
  is_active boolean DEFAULT true,
  auth_type text DEFAULT 'secret_key' CHECK (auth_type IN ('none', 'secret_key', 'api_key', 'jwt')),
  rate_limit_per_minute integer DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add RLS policies for flow_endpoints
ALTER TABLE flow_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flow endpoints"
  ON flow_endpoints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flow endpoints"
  ON flow_endpoints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flow endpoints"
  ON flow_endpoints FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flow endpoints"
  ON flow_endpoints FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to generate webhook secret
CREATE OR REPLACE FUNCTION generate_webhook_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 'rflow_' || encode(gen_random_bytes(24), 'base64');
END;
$$;

-- Create function to generate unique endpoint slug
CREATE OR REPLACE FUNCTION generate_endpoint_slug(flow_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Create base slug from flow name (lowercase, replace spaces with hyphens)
  base_slug := lower(regexp_replace(flow_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- Limit length and add random suffix
  base_slug := substring(base_slug from 1 for 30);
  final_slug := base_slug || '-' || substring(encode(gen_random_bytes(4), 'hex') from 1 for 8);
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM flow_projects WHERE endpoint_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || substring(encode(gen_random_bytes(4), 'hex') from 1 for 8);
    IF counter > 10 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN final_slug;
END;
$$;