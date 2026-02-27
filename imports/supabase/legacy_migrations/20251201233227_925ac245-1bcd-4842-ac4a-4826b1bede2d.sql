-- Create enum for API key scopes
CREATE TYPE public.api_key_scope AS ENUM ('read', 'write', 'delete', 'schema', 'admin');

-- Create database_api_keys table
CREATE TABLE public.database_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  database_id UUID REFERENCES public.databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes api_key_scope[] NOT NULL DEFAULT '{read}',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  rate_limit_per_day INTEGER NOT NULL DEFAULT 10000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  total_requests BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create api_usage_logs table
CREATE TABLE public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.database_api_keys(id) ON DELETE SET NULL,
  user_id UUID,
  database_id UUID REFERENCES public.databases(id) ON DELETE SET NULL,
  table_id UUID REFERENCES public.table_projects(id) ON DELETE SET NULL,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  request_body JSONB,
  response_size_bytes INTEGER,
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create database_webhooks table
CREATE TABLE public.database_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  database_id UUID REFERENCES public.databases(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.table_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL DEFAULT '{record.created}',
  headers JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  total_deliveries BIGINT NOT NULL DEFAULT 0,
  failed_deliveries BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook_delivery_logs table for tracking webhook deliveries
CREATE TABLE public.webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES public.database_webhooks(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.database_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for database_api_keys
CREATE POLICY "Users can manage their own API keys"
ON public.database_api_keys
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for api_usage_logs
CREATE POLICY "Users can view their own API usage logs"
ON public.api_usage_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert API usage logs"
ON public.api_usage_logs
FOR INSERT
WITH CHECK (true);

-- RLS Policies for database_webhooks
CREATE POLICY "Users can manage their own webhooks"
ON public.database_webhooks
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for webhook_delivery_logs
CREATE POLICY "Users can view their webhook delivery logs"
ON public.webhook_delivery_logs
FOR SELECT
USING (webhook_id IN (
  SELECT id FROM public.database_webhooks WHERE user_id = auth.uid()
));

CREATE POLICY "System can insert webhook delivery logs"
ON public.webhook_delivery_logs
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_api_keys_user_id ON public.database_api_keys(user_id);
CREATE INDEX idx_api_keys_database_id ON public.database_api_keys(database_id);
CREATE INDEX idx_api_keys_key_hash ON public.database_api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON public.database_api_keys(is_active);

CREATE INDEX idx_api_usage_logs_api_key_id ON public.api_usage_logs(api_key_id);
CREATE INDEX idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs(created_at);

CREATE INDEX idx_webhooks_user_id ON public.database_webhooks(user_id);
CREATE INDEX idx_webhooks_database_id ON public.database_webhooks(database_id);
CREATE INDEX idx_webhooks_table_id ON public.database_webhooks(table_id);

CREATE INDEX idx_webhook_delivery_logs_webhook_id ON public.webhook_delivery_logs(webhook_id);
CREATE INDEX idx_webhook_delivery_logs_created_at ON public.webhook_delivery_logs(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_database_api_keys_updated_at
BEFORE UPDATE ON public.database_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_api_keys_updated_at();

CREATE TRIGGER update_database_webhooks_updated_at
BEFORE UPDATE ON public.database_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_api_keys_updated_at();

-- Create function to generate API key (returns plain key, stores hash)
CREATE OR REPLACE FUNCTION public.generate_api_key(
  p_user_id UUID,
  p_database_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT 'API Key',
  p_scopes api_key_scope[] DEFAULT '{read}'::api_key_scope[],
  p_rate_limit_per_minute INTEGER DEFAULT 60,
  p_rate_limit_per_day INTEGER DEFAULT 10000,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_plain TEXT;
  v_key_hash TEXT;
  v_key_prefix TEXT;
  v_key_id UUID;
  v_result JSON;
BEGIN
  -- Generate a random API key
  v_key_plain := 'rdb_' || encode(gen_random_bytes(24), 'base64');
  v_key_plain := replace(replace(replace(v_key_plain, '+', ''), '/', ''), '=', '');
  
  -- Create prefix for display (first 8 chars after rdb_)
  v_key_prefix := 'rdb_' || substring(v_key_plain from 5 for 8) || '...';
  
  -- Hash the key for storage
  v_key_hash := encode(sha256(v_key_plain::bytea), 'hex');
  
  -- Insert the API key
  INSERT INTO public.database_api_keys (
    user_id, database_id, name, key_hash, key_prefix, scopes,
    rate_limit_per_minute, rate_limit_per_day, expires_at
  )
  VALUES (
    p_user_id, p_database_id, p_name, v_key_hash, v_key_prefix, p_scopes,
    p_rate_limit_per_minute, p_rate_limit_per_day, p_expires_at
  )
  RETURNING id INTO v_key_id;
  
  -- Return the plain key (only shown once)
  v_result := json_build_object(
    'id', v_key_id,
    'key', v_key_plain,
    'prefix', v_key_prefix,
    'name', p_name,
    'scopes', p_scopes
  );
  
  RETURN v_result;
END;
$$;

-- Create function to validate API key
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key TEXT)
RETURNS TABLE (
  key_id UUID,
  user_id UUID,
  database_id UUID,
  scopes api_key_scope[],
  rate_limit_per_minute INTEGER,
  rate_limit_per_day INTEGER,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_hash TEXT;
BEGIN
  -- Hash the provided key
  v_key_hash := encode(sha256(p_key::bytea), 'hex');
  
  -- Look up the key
  RETURN QUERY
  SELECT 
    ak.id as key_id,
    ak.user_id,
    ak.database_id,
    ak.scopes,
    ak.rate_limit_per_minute,
    ak.rate_limit_per_day,
    (ak.is_active AND (ak.expires_at IS NULL OR ak.expires_at > now())) as is_valid
  FROM public.database_api_keys ak
  WHERE ak.key_hash = v_key_hash;
END;
$$;