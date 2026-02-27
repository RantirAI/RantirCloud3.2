-- Allow workspace members to view workspace-scoped projects
-- (Fixes invited members seeing empty lists when queries filter by workspace_id)

-- Databases
ALTER TABLE public.databases ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'databases'
      AND policyname = 'Workspace members can view workspace databases'
  ) THEN
    CREATE POLICY "Workspace members can view workspace databases"
      ON public.databases
      FOR SELECT
      TO authenticated
      USING (
        workspace_id IS NOT NULL
        AND public.is_workspace_member(workspace_id)
      );
  END IF;
END$$;

-- Flow projects
ALTER TABLE public.flow_projects ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'flow_projects'
      AND policyname = 'Workspace members can view workspace flows'
  ) THEN
    CREATE POLICY "Workspace members can view workspace flows"
      ON public.flow_projects
      FOR SELECT
      TO authenticated
      USING (
        workspace_id IS NOT NULL
        AND public.is_workspace_member(workspace_id)
      );
  END IF;
END$$;

-- App projects
ALTER TABLE public.app_projects ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_projects'
      AND policyname = 'Workspace members can view workspace apps'
  ) THEN
    CREATE POLICY "Workspace members can view workspace apps"
      ON public.app_projects
      FOR SELECT
      TO authenticated
      USING (
        workspace_id IS NOT NULL
        AND public.is_workspace_member(workspace_id)
      );
  END IF;
END$$;

-- Cloud projects
ALTER TABLE public.cloud_projects ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cloud_projects'
      AND policyname = 'Workspace members can view workspace cloud projects'
  ) THEN
    CREATE POLICY "Workspace members can view workspace cloud projects"
      ON public.cloud_projects
      FOR SELECT
      TO authenticated
      USING (
        workspace_id IS NOT NULL
        AND public.is_workspace_member(workspace_id)
      );
  END IF;
END$$;