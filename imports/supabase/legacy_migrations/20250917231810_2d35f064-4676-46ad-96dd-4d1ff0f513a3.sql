-- Fix security definer functions to have proper search_path
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