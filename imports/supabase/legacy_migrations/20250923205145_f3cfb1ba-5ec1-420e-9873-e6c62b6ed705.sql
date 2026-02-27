-- Enable RLS on workspace_plans if not already enabled
ALTER TABLE workspace_plans ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view workspace plans for workspaces they belong to
CREATE POLICY "Users can view workspace plans for their workspaces" 
ON workspace_plans 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT w.id 
    FROM workspaces w 
    WHERE w.user_id = auth.uid()
  )
);

-- Create policy to allow workspace owners to manage workspace plans
CREATE POLICY "Workspace owners can manage workspace plans" 
ON workspace_plans 
FOR ALL 
USING (
  workspace_id IN (
    SELECT w.id 
    FROM workspaces w 
    WHERE w.user_id = auth.uid()
  )
);