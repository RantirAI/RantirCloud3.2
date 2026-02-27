-- Allow users to view workspaces where they are members
CREATE POLICY "Users can view workspaces where they are members"
ON workspaces
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT workspace_id
    FROM workspace_members
    WHERE user_id = auth.uid()
  )
);