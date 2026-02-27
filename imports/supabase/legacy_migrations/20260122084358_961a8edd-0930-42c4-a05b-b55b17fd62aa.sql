-- Add workspace_id column to main resource tables for workspace isolation
-- This enables proper data separation between workspaces

-- 1. Add workspace_id to databases table
ALTER TABLE public.databases 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 2. Add workspace_id to flow_projects table
ALTER TABLE public.flow_projects 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 3. Add workspace_id to app_projects table
ALTER TABLE public.app_projects 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 4. Add workspace_id to table_projects table
ALTER TABLE public.table_projects 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 5. Add workspace_id to user_searches table
ALTER TABLE public.user_searches 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 6. Add workspace_id to cloud_projects table
ALTER TABLE public.cloud_projects 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 7. Add workspace_id to user_activities table
ALTER TABLE public.user_activities 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_databases_workspace_id ON public.databases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_flow_projects_workspace_id ON public.flow_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_app_projects_workspace_id ON public.app_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_table_projects_workspace_id ON public.table_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_searches_workspace_id ON public.user_searches(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cloud_projects_workspace_id ON public.cloud_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_workspace_id ON public.user_activities(workspace_id);

-- Create a function to get user's current workspace_id
CREATE OR REPLACE FUNCTION public.get_current_workspace_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT current_workspace_id 
  FROM user_settings 
  WHERE id = user_uuid
  LIMIT 1;
$$;

-- Create a function to migrate existing data to default workspace
-- This assigns existing resources to the user's default workspace
CREATE OR REPLACE FUNCTION public.migrate_resources_to_default_workspace()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Migrate databases
  UPDATE databases d
  SET workspace_id = (
    SELECT w.id FROM workspaces w 
    WHERE w.user_id = d.user_id AND w.is_default = true
    LIMIT 1
  )
  WHERE d.workspace_id IS NULL;

  -- Migrate flow_projects
  UPDATE flow_projects fp
  SET workspace_id = (
    SELECT w.id FROM workspaces w 
    WHERE w.user_id = fp.user_id AND w.is_default = true
    LIMIT 1
  )
  WHERE fp.workspace_id IS NULL;

  -- Migrate app_projects
  UPDATE app_projects ap
  SET workspace_id = (
    SELECT w.id FROM workspaces w 
    WHERE w.user_id = ap.user_id AND w.is_default = true
    LIMIT 1
  )
  WHERE ap.workspace_id IS NULL;

  -- Migrate table_projects
  UPDATE table_projects tp
  SET workspace_id = (
    SELECT w.id FROM workspaces w 
    WHERE w.user_id = tp.user_id AND w.is_default = true
    LIMIT 1
  )
  WHERE tp.workspace_id IS NULL;

  -- Migrate user_searches
  UPDATE user_searches us
  SET workspace_id = (
    SELECT w.id FROM workspaces w 
    WHERE w.user_id = us.user_id AND w.is_default = true
    LIMIT 1
  )
  WHERE us.workspace_id IS NULL;

  -- Migrate cloud_projects
  UPDATE cloud_projects cp
  SET workspace_id = (
    SELECT w.id FROM workspaces w 
    WHERE w.user_id = cp.user_id AND w.is_default = true
    LIMIT 1
  )
  WHERE cp.workspace_id IS NULL;

  -- Migrate user_activities
  UPDATE user_activities ua
  SET workspace_id = (
    SELECT w.id FROM workspaces w 
    WHERE w.user_id = ua.user_id AND w.is_default = true
    LIMIT 1
  )
  WHERE ua.workspace_id IS NULL;
END;
$$;

-- Run the migration function to populate existing data
SELECT migrate_resources_to_default_workspace();