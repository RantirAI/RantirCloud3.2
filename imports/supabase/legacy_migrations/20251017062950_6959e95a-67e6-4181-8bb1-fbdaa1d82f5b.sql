-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to view profiles of workspace members
CREATE POLICY "Users can view workspace member profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT wm.user_id
    FROM workspace_members wm
    WHERE wm.workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  )
);