-- Fix security warnings by setting search_path on functions
CREATE OR REPLACE FUNCTION make_workspace_enterprise(
  target_workspace_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
SET search_path = public
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
SET search_path = public
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