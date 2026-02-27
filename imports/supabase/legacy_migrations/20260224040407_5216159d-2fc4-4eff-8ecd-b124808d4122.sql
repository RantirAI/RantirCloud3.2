
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.workspaces WHERE user_id = OLD.id;
  DELETE FROM public.databases WHERE user_id = OLD.id;
  DELETE FROM public.flow_projects WHERE user_id = OLD.id;
  DELETE FROM public.app_projects WHERE user_id = OLD.id;
  DELETE FROM public.table_projects WHERE user_id = OLD.id;
  DELETE FROM public.workspace_members WHERE user_id = OLD.id;
  DELETE FROM public.ai_conversations WHERE user_id = OLD.id;
  DELETE FROM public.user_activities WHERE user_id = OLD.id;
  DELETE FROM public.user_searches WHERE user_id = OLD.id;
  DELETE FROM public.profiles WHERE id = OLD.id;
  DELETE FROM public.database_api_keys WHERE user_id = OLD.id;
  DELETE FROM public.database_webhooks WHERE user_id = OLD.id;
  DELETE FROM public.embed_configurations WHERE user_id = OLD.id;
  DELETE FROM public.data_connections WHERE user_id = OLD.id;
  DELETE FROM public.app_components WHERE user_id = OLD.id;
  DELETE FROM public.app_variables WHERE user_id = OLD.id;
  DELETE FROM public.design_tokens WHERE user_id = OLD.id;
  DELETE FROM public.button_presets WHERE user_id = OLD.id;
  DELETE FROM public.ai_build_jobs WHERE user_id = OLD.id;
  RETURN OLD;
END;
$function$;
