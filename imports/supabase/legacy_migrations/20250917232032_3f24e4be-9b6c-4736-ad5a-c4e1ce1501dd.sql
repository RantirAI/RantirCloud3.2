-- Fix the handle_new_user function search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  workspace_id uuid;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  
  -- Insert user settings
  INSERT INTO public.user_settings (id)
  VALUES (new.id);
  
  -- Create default workspace
  INSERT INTO public.workspaces (user_id, name, is_default)
  VALUES (new.id, 'My Workspace', true)
  RETURNING id INTO workspace_id;
  
  -- Update user settings to set current workspace
  UPDATE public.user_settings 
  SET current_workspace_id = workspace_id
  WHERE id = new.id;
  
  RETURN new;
END;
$function$;