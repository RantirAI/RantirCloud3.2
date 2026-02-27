-- Create published_apps table
CREATE TABLE public.published_apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  custom_domain TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'published',
  access_type TEXT NOT NULL DEFAULT 'public',
  password_hash TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom_domains table
CREATE TABLE public.custom_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  published_app_id UUID NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  dns_verified BOOLEAN NOT NULL DEFAULT false,
  ssl_status TEXT NOT NULL DEFAULT 'pending',
  verification_token TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_analytics table
CREATE TABLE public.app_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  published_app_id UUID NOT NULL,
  visitor_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  referrer TEXT,
  session_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.published_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for published_apps
CREATE POLICY "Users can manage their own published apps" 
ON public.published_apps 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Published apps are publicly viewable" 
ON public.published_apps 
FOR SELECT 
USING (status = 'published');

-- RLS Policies for custom_domains
CREATE POLICY "Users can manage their own custom domains" 
ON public.custom_domains 
FOR ALL 
USING (published_app_id IN (
  SELECT id FROM published_apps WHERE user_id = auth.uid()
));

-- RLS Policies for app_analytics
CREATE POLICY "Users can view analytics for their published apps" 
ON public.app_analytics 
FOR SELECT 
USING (published_app_id IN (
  SELECT id FROM published_apps WHERE user_id = auth.uid()
));

CREATE POLICY "System can insert analytics" 
ON public.app_analytics 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_published_apps_slug ON public.published_apps(slug);
CREATE INDEX idx_published_apps_custom_domain ON public.published_apps(custom_domain);
CREATE INDEX idx_published_apps_user_id ON public.published_apps(user_id);
CREATE INDEX idx_custom_domains_domain ON public.custom_domains(domain);
CREATE INDEX idx_app_analytics_published_app_id ON public.app_analytics(published_app_id);
CREATE INDEX idx_app_analytics_created_at ON public.app_analytics(created_at);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_published_apps_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_published_apps_updated_at
BEFORE UPDATE ON public.published_apps
FOR EACH ROW
EXECUTE FUNCTION public.update_published_apps_timestamp();

CREATE TRIGGER update_custom_domains_updated_at
BEFORE UPDATE ON public.custom_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_published_apps_timestamp();