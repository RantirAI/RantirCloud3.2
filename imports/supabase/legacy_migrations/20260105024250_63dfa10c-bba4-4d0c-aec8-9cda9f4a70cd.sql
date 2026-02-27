-- Fix RLS so non-enterprise workspaces can read/write workspace customization.
-- Note: Postgres doesn't support CREATE POLICY IF NOT EXISTS, so we drop/recreate.

DROP POLICY IF EXISTS "Workspace owners can view customization" ON public.workspace_customization;
DROP POLICY IF EXISTS "Workspace members can view customization" ON public.workspace_customization;
DROP POLICY IF EXISTS "Workspace owners can manage customization" ON public.workspace_customization;
DROP POLICY IF EXISTS "Workspace admins can manage customization" ON public.workspace_customization;

-- Workspace owners can view customization
CREATE POLICY "Workspace owners can view customization"
ON public.workspace_customization
FOR SELECT
USING (
  workspace_id IN (
    SELECT w.id
    FROM public.workspaces w
    WHERE w.user_id = auth.uid()
  )
);

-- Workspace members can view customization
CREATE POLICY "Workspace members can view customization"
ON public.workspace_customization
FOR SELECT
USING (
  workspace_id IN (
    SELECT wm.workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

-- Workspace owners can manage customization (insert/update/delete)
CREATE POLICY "Workspace owners can manage customization"
ON public.workspace_customization
FOR ALL
USING (
  workspace_id IN (
    SELECT w.id
    FROM public.workspaces w
    WHERE w.user_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT w.id
    FROM public.workspaces w
    WHERE w.user_id = auth.uid()
  )
);

-- Workspace admins can manage customization (insert/update/delete)
CREATE POLICY "Workspace admins can manage customization"
ON public.workspace_customization
FOR ALL
USING (
  workspace_id IN (
    SELECT wm.workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.role = ANY (ARRAY['owner'::text, 'admin'::text])
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.role = ANY (ARRAY['owner'::text, 'admin'::text])
  )
);