-- Allow workspace members to update/modify flow projects in their workspace
CREATE POLICY "Workspace members can update workspace flow projects"
ON public.flow_projects
FOR UPDATE
USING (
  workspace_id IS NOT NULL 
  AND 
  public.is_workspace_member(workspace_id)
)
WITH CHECK (
  workspace_id IS NOT NULL 
  AND 
  public.is_workspace_member(workspace_id)
);

-- Allow workspace members to update/modify databases in their workspace
CREATE POLICY "Workspace members can update workspace databases"
ON public.databases
FOR UPDATE
USING (
  workspace_id IS NOT NULL 
  AND 
  public.is_workspace_member(workspace_id)
)
WITH CHECK (
  workspace_id IS NOT NULL 
  AND 
  public.is_workspace_member(workspace_id)
);