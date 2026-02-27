-- Fix profiles RLS policy to allow workspace members to view each other's profiles
DROP POLICY IF EXISTS "Users can view workspace member profiles" ON profiles;

CREATE POLICY "Users can view workspace member profiles" 
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR
  id IN (
    SELECT wm.user_id 
    FROM workspace_members wm
    WHERE wm.workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
);

-- Add policy for workspace owners/admins to view pending invitations
DROP POLICY IF EXISTS "Workspace owners can view invitations" ON workspace_invitations;

CREATE POLICY "Workspace owners can view invitations"
ON workspace_invitations FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE user_id = auth.uid()
  )
  OR
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR
  email = auth.email()
);