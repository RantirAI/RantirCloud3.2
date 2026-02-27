-- Allow workspace members to update/modify app projects in their workspace
CREATE POLICY "Workspace members can update workspace app projects"
ON public.app_projects
FOR UPDATE
USING (
  -- Project must belong to a workspace
  workspace_id IS NOT NULL 
  AND 
  -- User must be a member of that workspace
  public.is_workspace_member(workspace_id)
)
WITH CHECK (
  -- Same check for the updated row
  workspace_id IS NOT NULL 
  AND 
  public.is_workspace_member(workspace_id)
);