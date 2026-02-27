-- Enable RLS on workspace_members if not already enabled
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Enterprise members can view workspace members" ON workspace_members;

-- Allow users to view members of workspaces they belong to
CREATE POLICY "Users can view workspace members"
ON workspace_members
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow enterprise members to manage workspace members
CREATE POLICY "Enterprise admins can manage members"
ON workspace_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.user_group = 'enterprise'
    AND wm.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.user_group = 'enterprise'
    AND wm.role IN ('owner', 'admin')
  )
);