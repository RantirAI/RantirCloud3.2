-- Create enterprise_services table for managing custom enterprise services
CREATE TABLE public.enterprise_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  contract_duration_months INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  service_type TEXT NOT NULL DEFAULT 'custom' CHECK (service_type IN ('custom', 'standard')),
  price DECIMAL(10,2),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace_services junction table for attaching services to workspaces
CREATE TABLE public.workspace_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  service_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE(workspace_id, service_id)
);

-- Enable Row Level Security
ALTER TABLE public.enterprise_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enterprise_services
CREATE POLICY "Enterprise members can view their workspace services" 
ON public.enterprise_services 
FOR SELECT 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid() 
  AND workspace_members.user_group = 'enterprise'::user_group_type
));

CREATE POLICY "Enterprise members can create services for their workspace" 
ON public.enterprise_services 
FOR INSERT 
WITH CHECK (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid() 
  AND workspace_members.user_group = 'enterprise'::user_group_type
  AND workspace_members.role IN ('owner', 'admin')
));

CREATE POLICY "Enterprise members can update their workspace services" 
ON public.enterprise_services 
FOR UPDATE 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid() 
  AND workspace_members.user_group = 'enterprise'::user_group_type
  AND workspace_members.role IN ('owner', 'admin')
));

CREATE POLICY "Enterprise members can delete their workspace services" 
ON public.enterprise_services 
FOR DELETE 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid() 
  AND workspace_members.user_group = 'enterprise'::user_group_type
  AND workspace_members.role IN ('owner', 'admin')
));

-- RLS Policies for workspace_services
CREATE POLICY "Enterprise members can view workspace service assignments" 
ON public.workspace_services 
FOR SELECT 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid() 
  AND workspace_members.user_group = 'enterprise'::user_group_type
));

CREATE POLICY "Enterprise members can assign services to their workspace" 
ON public.workspace_services 
FOR INSERT 
WITH CHECK (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid() 
  AND workspace_members.user_group = 'enterprise'::user_group_type
  AND workspace_members.role IN ('owner', 'admin')
));

CREATE POLICY "Enterprise members can remove service assignments" 
ON public.workspace_services 
FOR DELETE 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid() 
  AND workspace_members.user_group = 'enterprise'::user_group_type
  AND workspace_members.role IN ('owner', 'admin')
));

-- Insert some standard enterprise services
INSERT INTO public.enterprise_services (
  workspace_id, 
  title, 
  description, 
  service_type, 
  price, 
  contract_duration_months
) VALUES 
  (
    '00000000-0000-0000-0000-000000000000'::uuid, 
    'Custom Development Services', 
    'Full-stack development services for custom enterprise applications and integrations',
    'standard',
    5000.00,
    3
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Enterprise Consulting', 
    'Strategic consulting services for enterprise architecture and implementation',
    'standard',
    3000.00,
    1
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Priority Support & Maintenance', 
    'Dedicated support channel with guaranteed response times and maintenance services',
    'standard',
    1500.00,
    12
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Custom Integration Development', 
    'Build custom integrations with third-party services and enterprise systems',
    'standard',
    4000.00,
    6
  );

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_enterprise_services_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enterprise_services_updated_at
    BEFORE UPDATE ON public.enterprise_services
    FOR EACH ROW
    EXECUTE FUNCTION update_enterprise_services_timestamp();