-- Create workspace for existing user Toby and update their settings
DO $$
DECLARE
  workspace_id uuid;
BEGIN
  -- Create workspace for Toby
  INSERT INTO public.workspaces (user_id, name, is_default)
  VALUES ('b78278ca-b898-47d3-b5db-de1c6b21d13f', 'My Workspace', true)
  RETURNING id INTO workspace_id;
  
  -- Update user settings to set current workspace
  UPDATE public.user_settings 
  SET current_workspace_id = workspace_id
  WHERE id = 'b78278ca-b898-47d3-b5db-de1c6b21d13f';
END $$;