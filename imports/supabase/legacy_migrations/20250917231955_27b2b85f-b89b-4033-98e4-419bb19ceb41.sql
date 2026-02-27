-- Fix all existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.update_table_project_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_flow_variables_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_subscription_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_search_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_published_apps_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_table_id_field()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Check if schema is not null and is a valid JSON
  IF NEW.schema IS NOT NULL THEN
    -- If there's no id field already present, add it
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(NEW.schema->'fields') AS fields
      WHERE fields->>'name' = 'id'
    ) THEN
      -- Add the id field at the beginning of the fields array
      NEW.schema = jsonb_set(
        NEW.schema,
        '{fields}',
        jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'id',
            'type', 'text',
            'required', true,
            'system', true
          )
        ) || (NEW.schema->'fields')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_subscription_plan_field()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Check if schema is not null and is a valid JSON
  IF NEW.schema IS NOT NULL AND NEW.subscription_enabled = true THEN
    -- If there's no selectedPlan field already present, add it
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(NEW.schema->'fields') AS fields
      WHERE fields->>'name' = 'selectedPlan'
    ) THEN
      -- Add the selectedPlan field to the fields array
      NEW.schema = jsonb_set(
        NEW.schema,
        '{fields}',
        (NEW.schema->'fields') || jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'selectedPlan',
            'type', 'json',
            'required', false,
            'system', true,
            'description', 'Automatically stores selected subscription plan information'
          )
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_enterprise_services_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;