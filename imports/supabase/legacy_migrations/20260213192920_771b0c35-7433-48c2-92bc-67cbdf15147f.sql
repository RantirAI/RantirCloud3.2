
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Enterprise admins can manage invitations" ON workspace_invitations;

-- Create new policy that allows workspace owners AND enterprise admins to manage invitations
CREATE POLICY "Workspace owners and admins can manage invitations"
ON workspace_invitations
FOR ALL
USING (
  -- Workspace owner (from workspaces table)
  workspace_id IN (
    SELECT id FROM workspaces WHERE user_id = auth.uid()
  )
  OR
  -- Enterprise admin (from workspace_members table)
  is_enterprise_admin(workspace_id)
);
