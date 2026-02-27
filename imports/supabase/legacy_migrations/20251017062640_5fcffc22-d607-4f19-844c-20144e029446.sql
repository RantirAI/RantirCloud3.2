-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Enterprise admins can manage members" ON workspace_members;

-- Create a security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = target_workspace_id
    AND user_id = auth.uid()
  );
$$;

-- Create a simpler policy that uses the function
CREATE POLICY "Users can view workspace members"
ON workspace_members
FOR SELECT
TO authenticated
USING (is_workspace_member(workspace_id));

-- Allow enterprise admins to manage members
CREATE POLICY "Enterprise admins can manage members"
ON workspace_members
FOR ALL
TO authenticated
USING (is_enterprise_admin(workspace_id))
WITH CHECK (is_enterprise_admin(workspace_id));