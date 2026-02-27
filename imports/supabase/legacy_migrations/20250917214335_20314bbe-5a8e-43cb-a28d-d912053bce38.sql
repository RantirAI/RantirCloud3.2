-- Add enterprise field to workspaces
ALTER TABLE workspaces ADD COLUMN is_enterprise boolean DEFAULT false;

-- Create enum for user groups
CREATE TYPE user_group_type AS ENUM ('standard', 'enterprise');

-- Create workspace members table
CREATE TABLE workspace_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  user_group user_group_type DEFAULT 'standard',
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Billing plans for enterprise features
CREATE TABLE billing_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0.00,
  interval text NOT NULL CHECK (interval IN ('monthly', 'yearly', 'one-time')),
  seat_limit integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_enterprise boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Link workspaces to billing plans
CREATE TABLE workspace_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES billing_plans(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
  seats integer NOT NULL DEFAULT 1,
  current_period_start timestamptz,
  current_period_end timestamptz,
  external_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Enterprise API keys with HMAC-based generation
CREATE TABLE enterprise_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  last4 text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{"read", "write"}',
  status text DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'archived')),
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audit log for enterprise actions
CREATE TABLE enterprise_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_members
CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage members" ON workspace_members
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for billing_plans
CREATE POLICY "Anyone can read active billing plans" ON billing_plans
  FOR SELECT USING (is_active = true);

-- RLS Policies for workspace_plans
CREATE POLICY "Members can view workspace plans" ON workspace_plans
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage plans" ON workspace_plans
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for enterprise_keys
CREATE POLICY "Enterprise members can manage keys" ON enterprise_keys
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND user_group = 'enterprise'
    )
  );

-- RLS Policies for enterprise_audit
CREATE POLICY "Enterprise members can view audit logs" ON enterprise_audit
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND user_group = 'enterprise'
    )
  );

CREATE POLICY "System can insert audit logs" ON enterprise_audit
  FOR INSERT WITH CHECK (true);

-- Insert default enterprise plan
INSERT INTO billing_plans (code, name, price, interval, seat_limit, features, is_enterprise)
VALUES 
  ('enterprise_starter', 'Enterprise Starter', 99.00, 'monthly', 10, 
   '["API Access", "Priority Support", "Advanced Analytics", "Custom Integrations"]'::jsonb, true),
  ('enterprise_pro', 'Enterprise Pro', 299.00, 'monthly', 50, 
   '["API Access", "Priority Support", "Advanced Analytics", "Custom Integrations", "SSO", "Advanced Security"]'::jsonb, true);

-- Function to promote workspace to enterprise
CREATE OR REPLACE FUNCTION make_workspace_enterprise(
  target_workspace_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_plan_id uuid;
  api_key_hash text;
  api_key_plain text;
  result json;
  workspace_secret text;
BEGIN
  -- Check if user is workspace owner
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = target_workspace_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to upgrade this workspace';
  END IF;

  -- Update workspace to enterprise
  UPDATE workspaces 
  SET is_enterprise = true, updated_at = now()
  WHERE id = target_workspace_id;

  -- Get default enterprise plan
  SELECT id INTO default_plan_id
  FROM billing_plans 
  WHERE code = 'enterprise_starter' AND is_active = true
  LIMIT 1;

  -- Insert workspace plan
  INSERT INTO workspace_plans (workspace_id, plan_id, seats, current_period_start, current_period_end)
  VALUES (target_workspace_id, default_plan_id, 10, now(), now() + interval '1 month');

  -- Generate API key
  workspace_secret := 'rantir_enterprise_' || target_workspace_id::text;
  api_key_plain := 'rant_' || encode(gen_random_bytes(24), 'base64');
  api_key_hash := encode(hmac(api_key_plain, workspace_secret, 'sha256'), 'hex');

  -- Store API key
  INSERT INTO enterprise_keys (workspace_id, key_hash, last4, created_by)
  VALUES (target_workspace_id, api_key_hash, right(api_key_plain, 4), auth.uid());

  -- Update workspace owner to enterprise group
  INSERT INTO workspace_members (workspace_id, user_id, role, user_group, joined_at)
  VALUES (target_workspace_id, auth.uid(), 'owner', 'enterprise', now())
  ON CONFLICT (workspace_id, user_id) 
  DO UPDATE SET user_group = 'enterprise', role = 'owner';

  -- Log the action
  INSERT INTO enterprise_audit (workspace_id, actor_id, action, details)
  VALUES (target_workspace_id, auth.uid(), 'workspace_promoted', 
          json_build_object('api_key_created', true, 'plan_assigned', default_plan_id));

  -- Return the plain API key (only shown once)
  result := json_build_object(
    'success', true,
    'api_key', api_key_plain,
    'workspace_id', target_workspace_id
  );

  RETURN result;
END;
$$;

-- Function to generate new API key
CREATE OR REPLACE FUNCTION generate_enterprise_key(
  target_workspace_id uuid,
  key_scopes text[] DEFAULT '{"read", "write"}'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key_hash text;
  api_key_plain text;
  workspace_secret text;
  result json;
BEGIN
  -- Check if user is enterprise member of workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = target_workspace_id 
    AND user_id = auth.uid() 
    AND user_group = 'enterprise'
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to generate keys for this workspace';
  END IF;

  -- Generate API key
  workspace_secret := 'rantir_enterprise_' || target_workspace_id::text;
  api_key_plain := 'rant_' || encode(gen_random_bytes(24), 'base64');
  api_key_hash := encode(hmac(api_key_plain, workspace_secret, 'sha256'), 'hex');

  -- Store API key
  INSERT INTO enterprise_keys (workspace_id, key_hash, last4, scopes, created_by)
  VALUES (target_workspace_id, api_key_hash, right(api_key_plain, 4), key_scopes, auth.uid());

  -- Log the action
  INSERT INTO enterprise_audit (workspace_id, actor_id, action, details)
  VALUES (target_workspace_id, auth.uid(), 'api_key_generated', 
          json_build_object('scopes', key_scopes));

  result := json_build_object(
    'success', true,
    'api_key', api_key_plain
  );

  RETURN result;
END;
$$;

-- Function to revoke API key
CREATE OR REPLACE FUNCTION revoke_enterprise_key(
  key_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_workspace_id uuid;
  result json;
BEGIN
  -- Get workspace_id from key and check permissions
  SELECT workspace_id INTO target_workspace_id
  FROM enterprise_keys 
  WHERE id = key_id;

  IF NOT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = target_workspace_id 
    AND user_id = auth.uid() 
    AND user_group = 'enterprise'
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to revoke keys for this workspace';
  END IF;

  -- Update key status
  UPDATE enterprise_keys 
  SET status = 'revoked', updated_at = now()
  WHERE id = key_id;

  -- Log the action
  INSERT INTO enterprise_audit (workspace_id, actor_id, action, resource_type, resource_id)
  VALUES (target_workspace_id, auth.uid(), 'api_key_revoked', 'enterprise_key', key_id::text);

  result := json_build_object('success', true);
  RETURN result;
END;
$$;