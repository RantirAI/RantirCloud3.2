-- Add workspace member SELECT access for table_projects
CREATE POLICY "Workspace members can view workspace table projects"
ON public.table_projects
FOR SELECT
USING (
  workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)
);