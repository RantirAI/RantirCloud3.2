-- Drop the existing owner-only delete policy
DROP POLICY IF EXISTS "Users can delete their own flow projects" ON public.flow_projects;

-- Create a new policy that allows both owners AND workspace members to delete
CREATE POLICY "Users can delete own or workspace flow projects"
ON public.flow_projects
FOR DELETE
USING (
  auth.uid() = user_id 
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
);

-- Also add UPDATE policy for workspace members
DROP POLICY IF EXISTS "Users can update their own flow projects" ON public.flow_projects;

CREATE POLICY "Users can update own or workspace flow projects"
ON public.flow_projects
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
);