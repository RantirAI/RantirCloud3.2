-- Enhance flow_endpoints table for API and Webhook deployment
-- Add columns for endpoint type, parameters, rate limiting, and analytics

-- Add new columns to flow_endpoints if they don't exist
ALTER TABLE public.flow_endpoints 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS required_headers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS response_schema JSONB,
ADD COLUMN IF NOT EXISTS cors_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cors_origins TEXT[] DEFAULT ARRAY['*'],
ADD COLUMN IF NOT EXISTS timeout_seconds INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS retry_config JSONB DEFAULT '{"enabled": false, "maxRetries": 3, "backoffMs": 1000}'::jsonb,
ADD COLUMN IF NOT EXISTS cache_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cache_ttl_seconds INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_response_time_ms NUMERIC DEFAULT 0;

-- Create endpoint analytics table
CREATE TABLE IF NOT EXISTS public.flow_endpoint_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint_id UUID REFERENCES public.flow_endpoints(id) ON DELETE CASCADE,
  flow_project_id UUID REFERENCES public.flow_projects(id) ON DELETE CASCADE,
  called_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  error_message TEXT,
  request_params JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_flow_endpoint_analytics_endpoint_id ON public.flow_endpoint_analytics(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_flow_endpoint_analytics_flow_project_id ON public.flow_endpoint_analytics(flow_project_id);
CREATE INDEX IF NOT EXISTS idx_flow_endpoint_analytics_called_at ON public.flow_endpoint_analytics(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_endpoint_analytics_status_code ON public.flow_endpoint_analytics(status_code);

-- Enable RLS
ALTER TABLE public.flow_endpoint_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for flow_endpoint_analytics
CREATE POLICY "Users can view their own endpoint analytics" 
ON public.flow_endpoint_analytics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.flow_projects fp 
    WHERE fp.id = flow_project_id AND fp.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert analytics" 
ON public.flow_endpoint_analytics 
FOR INSERT 
WITH CHECK (true);

-- Add endpoint_type column to flow_projects for the main deployment type
ALTER TABLE public.flow_projects 
ADD COLUMN IF NOT EXISTS primary_endpoint_type TEXT DEFAULT 'webhook',
ADD COLUMN IF NOT EXISTS allowed_methods TEXT[] DEFAULT ARRAY['POST'],
ADD COLUMN IF NOT EXISTS api_parameters JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS api_headers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS api_description TEXT,
ADD COLUMN IF NOT EXISTS rate_limit_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rate_limit_requests INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS rate_limit_window_seconds INTEGER DEFAULT 60;