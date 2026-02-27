-- Allow workspace members to delete app projects in their workspace
CREATE POLICY "Workspace members can delete workspace app projects"
ON public.app_projects
FOR DELETE
USING (
  -- App project must belong to a workspace
  workspace_id IS NOT NULL 
  AND 
  -- User must be a member of that workspace
  public.is_workspace_member(workspace_id)
);