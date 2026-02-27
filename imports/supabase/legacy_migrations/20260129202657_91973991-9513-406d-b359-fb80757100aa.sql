-- Create a function to clean up all user data when a user is deleted
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all workspaces owned by the user (this will cascade to workspace_members)
  DELETE FROM public.workspaces WHERE user_id = OLD.id;
  
  -- Delete all databases owned by the user
  DELETE FROM public.databases WHERE user_id = OLD.id;
  
  -- Delete all flow projects owned by the user
  DELETE FROM public.flow_projects WHERE user_id = OLD.id;
  
  -- Delete all app projects owned by the user
  DELETE FROM public.app_projects WHERE user_id = OLD.id;
  
  -- Delete all cloud projects owned by the user
  DELETE FROM public.cloud_projects WHERE user_id = OLD.id;
  
  -- Delete all table projects owned by the user
  DELETE FROM public.table_projects WHERE user_id = OLD.id;
  
  -- Delete workspace memberships where user is a member
  DELETE FROM public.workspace_members WHERE user_id = OLD.id;
  
  -- Delete AI conversations
  DELETE FROM public.ai_conversations WHERE user_id = OLD.id;
  
  -- Delete user activities
  DELETE FROM public.user_activities WHERE user_id = OLD.id;
  
  -- Delete user searches
  DELETE FROM public.user_searches WHERE user_id = OLD.id;
  
  -- Delete user profile
  DELETE FROM public.profiles WHERE id = OLD.id;
  
  -- Delete database API keys
  DELETE FROM public.database_api_keys WHERE user_id = OLD.id;
  
  -- Delete database webhooks
  DELETE FROM public.database_webhooks WHERE user_id = OLD.id;
  
  -- Delete embed configurations
  DELETE FROM public.embed_configurations WHERE user_id = OLD.id;
  
  -- Delete data connections
  DELETE FROM public.data_connections WHERE user_id = OLD.id;
  
  -- Delete app components
  DELETE FROM public.app_components WHERE user_id = OLD.id;
  
  -- Delete app variables
  DELETE FROM public.app_variables WHERE user_id = OLD.id;
  
  -- Delete design tokens
  DELETE FROM public.design_tokens WHERE user_id = OLD.id;
  
  -- Delete button presets
  DELETE FROM public.button_presets WHERE user_id = OLD.id;
  
  -- Delete AI build jobs
  DELETE FROM public.ai_build_jobs WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger on auth.users to clean up when user is deleted
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deletion();