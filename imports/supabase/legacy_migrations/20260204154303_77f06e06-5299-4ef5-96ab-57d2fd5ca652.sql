-- Add workspace-aware RLS policies to flow_data table
-- This allows workspace members to manage flow data for projects in their workspace

-- 1. Add SELECT policy for workspace members
CREATE POLICY "Workspace members can view workspace flow data"
ON public.flow_data
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM flow_projects fp
    WHERE fp.id = flow_data.flow_project_id
    AND fp.workspace_id IS NOT NULL
    AND public.is_workspace_member(fp.workspace_id)
  )
);

-- 2. Add INSERT policy for workspace members
CREATE POLICY "Workspace members can insert workspace flow data"
ON public.flow_data
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM flow_projects fp
    WHERE fp.id = flow_data.flow_project_id
    AND fp.workspace_id IS NOT NULL
    AND public.is_workspace_member(fp.workspace_id)
  )
);

-- 3. Add UPDATE policy for workspace members
CREATE POLICY "Workspace members can update workspace flow data"
ON public.flow_data
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM flow_projects fp
    WHERE fp.id = flow_data.flow_project_id
    AND fp.workspace_id IS NOT NULL
    AND public.is_workspace_member(fp.workspace_id)
  )
);

-- 4. Add DELETE policy for workspace members
CREATE POLICY "Workspace members can delete workspace flow data"
ON public.flow_data
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM flow_projects fp
    WHERE fp.id = flow_data.flow_project_id
    AND fp.workspace_id IS NOT NULL
    AND public.is_workspace_member(fp.workspace_id)
  )
);