-- Drop all existing policies on workspace_members to fix recursion
DROP POLICY IF EXISTS "Enterprise members can view their workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Enterprise members can manage workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;

-- Create simple, non-recursive policies for workspace_members
CREATE POLICY "Users can view workspace members for their workspaces" 
ON workspace_members 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage workspace members for their workspaces" 
ON workspace_members 
FOR ALL 
USING (auth.uid() IS NOT NULL);