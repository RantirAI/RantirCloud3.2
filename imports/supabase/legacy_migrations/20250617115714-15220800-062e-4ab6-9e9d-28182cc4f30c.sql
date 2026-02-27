-- Create a function to automatically add a "Selected Plan" field to tables
CREATE OR REPLACE FUNCTION public.ensure_subscription_plan_field()
RETURNS trigger
LANGUAGE plpgsql
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