-- Fix infinite recursion in workspace_members RLS policies by creating security definer functions
CREATE OR REPLACE FUNCTION public.get_user_workspace_role(target_workspace_id uuid)
RETURNS TEXT AS $$
  SELECT role 
  FROM public.workspace_members 
  WHERE workspace_id = target_workspace_id 
    AND user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_enterprise_member(target_workspace_id uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.workspace_members 
    WHERE workspace_id = target_workspace_id 
      AND user_id = auth.uid() 
      AND user_group = 'enterprise'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_enterprise_admin(target_workspace_id uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.workspace_members 
    WHERE workspace_id = target_workspace_id 
      AND user_id = auth.uid() 
      AND user_group = 'enterprise'
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Update enterprise_services table to add missing fields
ALTER TABLE public.enterprise_services 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS monthly_price numeric,
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;

-- Update the RLS policies for enterprise_services to use security definer functions
DROP POLICY IF EXISTS "Enterprise members can view their workspace services" ON public.enterprise_services;
DROP POLICY IF EXISTS "Enterprise members can create services for their workspace" ON public.enterprise_services;
DROP POLICY IF EXISTS "Enterprise members can update their workspace services" ON public.enterprise_services;
DROP POLICY IF EXISTS "Enterprise members can delete their workspace services" ON public.enterprise_services;

CREATE POLICY "Enterprise members can view their workspace services" 
ON public.enterprise_services 
FOR SELECT 
USING (public.is_enterprise_member(workspace_id));

CREATE POLICY "Enterprise members can create services for their workspace" 
ON public.enterprise_services 
FOR INSERT 
WITH CHECK (public.is_enterprise_admin(workspace_id));

CREATE POLICY "Enterprise members can update their workspace services" 
ON public.enterprise_services 
FOR UPDATE 
USING (public.is_enterprise_admin(workspace_id));

CREATE POLICY "Enterprise members can delete their workspace services" 
ON public.enterprise_services 
FOR DELETE 
USING (public.is_enterprise_admin(workspace_id));

-- Update other tables that might have similar RLS issues with workspace_members
-- Fix enterprise_keys policies
DROP POLICY IF EXISTS "Enterprise members can manage keys" ON public.enterprise_keys;

CREATE POLICY "Enterprise members can manage keys" 
ON public.enterprise_keys 
FOR ALL 
USING (public.is_enterprise_member(workspace_id));

-- Fix enterprise_uploads policies
DROP POLICY IF EXISTS "Enterprise members can view their workspace uploads" ON public.enterprise_uploads;
DROP POLICY IF EXISTS "Enterprise members can upload files" ON public.enterprise_uploads;
DROP POLICY IF EXISTS "Enterprise members can update their workspace uploads" ON public.enterprise_uploads;
DROP POLICY IF EXISTS "Enterprise members can delete their workspace uploads" ON public.enterprise_uploads;

CREATE POLICY "Enterprise members can view their workspace uploads" 
ON public.enterprise_uploads 
FOR SELECT 
USING (public.is_enterprise_member(workspace_id));

CREATE POLICY "Enterprise members can upload files" 
ON public.enterprise_uploads 
FOR INSERT 
WITH CHECK (public.is_enterprise_member(workspace_id));

CREATE POLICY "Enterprise members can update their workspace uploads" 
ON public.enterprise_uploads 
FOR UPDATE 
USING (public.is_enterprise_member(workspace_id));

CREATE POLICY "Enterprise members can delete their workspace uploads" 
ON public.enterprise_uploads 
FOR DELETE 
USING (public.is_enterprise_member(workspace_id));

-- Fix enterprise_audit policies
DROP POLICY IF EXISTS "Enterprise members can view audit logs" ON public.enterprise_audit;

CREATE POLICY "Enterprise members can view audit logs" 
ON public.enterprise_audit 
FOR SELECT 
USING (public.is_enterprise_member(workspace_id));