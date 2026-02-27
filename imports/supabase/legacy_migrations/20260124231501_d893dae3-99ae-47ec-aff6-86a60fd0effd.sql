-- Create MCP API keys table for user-specific authentication
CREATE TABLE public.mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'MCP API Key',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(key_hash)
);

-- Enable RLS
ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own keys
CREATE POLICY "Users can view own MCP keys" ON public.mcp_api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own MCP keys" ON public.mcp_api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own MCP keys" ON public.mcp_api_keys
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own MCP keys" ON public.mcp_api_keys
  FOR DELETE USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_mcp_api_keys_key_hash ON public.mcp_api_keys(key_hash);
CREATE INDEX idx_mcp_api_keys_user_id ON public.mcp_api_keys(user_id);

-- Function to validate MCP API key (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.validate_mcp_key(p_key TEXT)
RETURNS TABLE(user_id UUID, workspace_id UUID, is_valid BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key_hash TEXT;
BEGIN
  -- Hash the provided key
  v_key_hash := encode(sha256(p_key::bytea), 'hex');
  
  -- Update last_used_at and return key info
  RETURN QUERY
  UPDATE mcp_api_keys mk
  SET last_used_at = now()
  WHERE mk.key_hash = v_key_hash
    AND mk.is_active = true
    AND (mk.expires_at IS NULL OR mk.expires_at > now())
  RETURNING mk.user_id, mk.workspace_id, true as is_valid;
END;
$$;