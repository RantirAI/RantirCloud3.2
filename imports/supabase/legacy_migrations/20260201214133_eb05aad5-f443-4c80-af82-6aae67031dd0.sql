-- Create flow_secrets reference table (links vault secrets to flow projects)
CREATE TABLE public.flow_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_project_id UUID NOT NULL REFERENCES flow_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  vault_secret_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(flow_project_id, name)
);

-- Enable RLS
ALTER TABLE public.flow_secrets ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only manage secrets for their own flow projects
CREATE POLICY "Users can manage their flow secrets"
  ON public.flow_secrets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flow_projects fp
      WHERE fp.id = flow_secrets.flow_project_id
      AND fp.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_flow_secrets_timestamp
  BEFORE UPDATE ON public.flow_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a secret for a flow project using Supabase Vault
CREATE OR REPLACE FUNCTION public.create_flow_secret(
  p_flow_project_id UUID,
  p_name TEXT,
  p_value TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vault_id UUID;
  v_secret_id UUID;
  v_unique_name TEXT;
  v_user_id UUID;
BEGIN
  -- Get the user_id from the flow project
  SELECT user_id INTO v_user_id
  FROM flow_projects
  WHERE id = p_flow_project_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Flow project not found';
  END IF;
  
  -- Generate unique vault name
  v_unique_name := 'flow_' || p_flow_project_id::text || '_' || p_name;
  
  -- Create encrypted secret in vault
  SELECT vault.create_secret(
    p_value,
    v_unique_name,
    COALESCE(p_description, 'Flow secret: ' || p_name)
  ) INTO v_vault_id;
  
  -- Create reference in flow_secrets table
  INSERT INTO flow_secrets (flow_project_id, user_id, name, description, vault_secret_id)
  VALUES (p_flow_project_id, v_user_id, p_name, p_description, v_vault_id)
  RETURNING id INTO v_secret_id;
  
  RETURN v_secret_id;
END;
$$;

-- Retrieve a single decrypted secret
CREATE OR REPLACE FUNCTION public.get_flow_secret(
  p_flow_project_id UUID,
  p_name TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vault_id UUID;
  v_decrypted TEXT;
BEGIN
  -- Get vault secret ID
  SELECT vault_secret_id INTO v_vault_id
  FROM flow_secrets
  WHERE flow_project_id = p_flow_project_id AND name = p_name;
  
  IF v_vault_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Decrypt from vault
  SELECT decrypted_secret INTO v_decrypted
  FROM vault.decrypted_secrets
  WHERE id = v_vault_id;
  
  RETURN v_decrypted;
END;
$$;

-- Get all decrypted secrets for a flow project (for flow executor)
CREATE OR REPLACE FUNCTION public.get_all_flow_secrets(p_flow_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '{}';
  v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT fs.name, ds.decrypted_secret
    FROM flow_secrets fs
    JOIN vault.decrypted_secrets ds ON ds.id = fs.vault_secret_id
    WHERE fs.flow_project_id = p_flow_project_id
  LOOP
    v_result := v_result || jsonb_build_object(v_record.name, v_record.decrypted_secret);
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- Update an existing secret
CREATE OR REPLACE FUNCTION public.update_flow_secret(
  p_flow_project_id UUID,
  p_name TEXT,
  p_new_value TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vault_id UUID;
BEGIN
  SELECT vault_secret_id INTO v_vault_id
  FROM flow_secrets
  WHERE flow_project_id = p_flow_project_id AND name = p_name;
  
  IF v_vault_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update secret in vault
  PERFORM vault.update_secret(v_vault_id, p_new_value);
  
  -- Update timestamp
  UPDATE flow_secrets
  SET updated_at = now()
  WHERE flow_project_id = p_flow_project_id AND name = p_name;
  
  RETURN TRUE;
END;
$$;

-- Delete a secret
CREATE OR REPLACE FUNCTION public.delete_flow_secret(
  p_secret_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vault_id UUID;
BEGIN
  -- Get and delete reference
  DELETE FROM flow_secrets
  WHERE id = p_secret_id
  RETURNING vault_secret_id INTO v_vault_id;
  
  IF v_vault_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Delete from vault
  DELETE FROM vault.secrets WHERE id = v_vault_id;
  
  RETURN TRUE;
END;
$$;