-- Drop the existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view workspace plans for their workspaces" ON workspace_plans;
DROP POLICY IF EXISTS "Workspace owners can manage workspace plans" ON workspace_plans;

-- Create a simple policy that allows authenticated users to see all workspace plans
-- This is temporary to fix the immediate issue
CREATE POLICY "Authenticated users can view workspace plans" 
ON workspace_plans 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to manage workspace plans
CREATE POLICY "Authenticated users can manage workspace plans" 
ON workspace_plans 
FOR ALL 
USING (auth.uid() IS NOT NULL);