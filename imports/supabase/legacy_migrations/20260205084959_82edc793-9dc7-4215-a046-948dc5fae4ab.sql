-- Allow workspace members to delete databases in their workspace
CREATE POLICY "Workspace members can delete workspace databases"
ON public.databases
FOR DELETE
USING (
  -- Database must belong to a workspace
  workspace_id IS NOT NULL 
  AND 
  -- User must be a member of that workspace
  public.is_workspace_member(workspace_id)
);