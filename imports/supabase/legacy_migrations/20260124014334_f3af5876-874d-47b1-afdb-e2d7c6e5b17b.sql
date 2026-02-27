-- Create community_plugins table for storing plugin metadata
CREATE TABLE public.community_plugins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'data_documents', 'logic_flows', 'app_builder', 'ai_cloud', 'plugins', 'presentations', 'websites'
  icon TEXT, -- icon name from lucide
  color TEXT, -- tailwind color class
  image_url TEXT, -- background image URL
  author_name TEXT,
  author_email TEXT,
  version TEXT DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  install_count INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_plugin_installations table for tracking workspace installations
CREATE TABLE public.community_plugin_installations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plugin_id UUID NOT NULL REFERENCES public.community_plugins(id) ON DELETE CASCADE,
  installed_by UUID,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, plugin_id)
);

-- Enable RLS
ALTER TABLE public.community_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_plugin_installations ENABLE ROW LEVEL SECURITY;

-- RLS policies for community_plugins (readable by all authenticated users)
CREATE POLICY "Anyone can view active plugins"
ON public.community_plugins
FOR SELECT
USING (is_active = true);

-- RLS policies for installations (workspace members only)
CREATE POLICY "Workspace members can view installations"
ON public.community_plugin_installations
FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can install plugins"
ON public.community_plugin_installations
FOR INSERT
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update installations"
ON public.community_plugin_installations
FOR UPDATE
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can uninstall plugins"
ON public.community_plugin_installations
FOR DELETE
USING (public.is_workspace_member(workspace_id));

-- Create indexes
CREATE INDEX idx_community_plugins_category ON public.community_plugins(category);
CREATE INDEX idx_community_plugins_active ON public.community_plugins(is_active);
CREATE INDEX idx_community_plugin_installations_workspace ON public.community_plugin_installations(workspace_id);
CREATE INDEX idx_community_plugin_installations_plugin ON public.community_plugin_installations(plugin_id);

-- Insert sample plugins for each category
INSERT INTO public.community_plugins (name, description, category, icon, color, is_featured, metadata) VALUES
-- Data & Documents plugins
('Advanced Charts', 'Create beautiful data visualizations with custom charts', 'data_documents', 'BarChart3', 'bg-amber-500', true, '{"features": ["Interactive charts", "Export to PNG/SVG", "Real-time updates"]}'),
('CSV Import Pro', 'Bulk import data from CSV files with smart mapping', 'data_documents', 'FileSpreadsheet', 'bg-green-500', false, '{"features": ["Smart column mapping", "Data validation", "Batch processing"]}'),
('Document Templates', 'Pre-built document templates for reports and proposals', 'data_documents', 'FileText', 'bg-orange-500', true, '{"features": ["50+ templates", "Custom variables", "PDF export"]}'),

-- Logic Flows plugins
('Zapier Connector', 'Connect your flows to thousands of apps via Zapier', 'logic_flows', 'Zap', 'bg-purple-500', true, '{"features": ["2000+ app integrations", "Two-way sync", "Webhook triggers"]}'),
('Cron Scheduler', 'Schedule flows to run at specific times', 'logic_flows', 'Clock', 'bg-indigo-500', false, '{"features": ["Cron expressions", "Timezone support", "Retry logic"]}'),
('API Builder', 'Create custom REST APIs from your flows', 'logic_flows', 'Code', 'bg-violet-500', true, '{"features": ["Auto documentation", "Rate limiting", "Authentication"]}'),

-- App Builder plugins
('Form Widgets', 'Advanced form components for your apps', 'app_builder', 'FormInput', 'bg-blue-500', true, '{"features": ["Date pickers", "File uploads", "Signature capture"]}'),
('UI Kit Pro', 'Premium UI components for professional apps', 'app_builder', 'Layers', 'bg-cyan-500', false, '{"features": ["100+ components", "Dark mode", "Responsive"]}'),
('Auth Templates', 'Pre-built authentication flows', 'app_builder', 'Shield', 'bg-teal-500', true, '{"features": ["Social login", "2FA support", "Email verification"]}'),

-- AI Cloud plugins
('GPT Assistant', 'AI-powered chat assistant for your workspace', 'ai_cloud', 'Bot', 'bg-sky-400', true, '{"features": ["Context-aware", "Custom training", "API access"]}'),
('Image Generator', 'Generate images using AI models', 'ai_cloud', 'Image', 'bg-pink-500', false, '{"features": ["DALL-E 3", "Stable Diffusion", "Batch generation"]}'),
('Smart Analytics', 'AI-powered insights from your data', 'ai_cloud', 'TrendingUp', 'bg-emerald-500', true, '{"features": ["Auto insights", "Predictions", "Anomaly detection"]}');

-- Trigger to update updated_at
CREATE TRIGGER update_community_plugins_updated_at
BEFORE UPDATE ON public.community_plugins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_plugin_installations_updated_at
BEFORE UPDATE ON public.community_plugin_installations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();