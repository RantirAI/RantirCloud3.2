-- Copy Kikoff database and table project to farrel206@gmail.com user

-- First, create the new database for the target user
INSERT INTO public.databases (
  id,
  name,
  description,
  color,
  user_id,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'Kikoff Growth',
  'This is the official Kikoff Webflow Email leads',
  '#3B82F6',
  '4ba7d3dc-8bf4-4a88-9f98-c1df57e09020',
  now(),
  now()
FROM public.databases 
WHERE user_id = 'b78278ca-b898-47d3-b5db-de1c6b21d13f' 
  AND name = 'Kikoff Growth'
LIMIT 1;

-- Get the new database ID for the table project creation
DO $$
DECLARE
    new_database_id uuid;
    new_table_project_id uuid;
    original_table_project record;
BEGIN
    -- Get the newly created database ID
    SELECT id INTO new_database_id 
    FROM public.databases 
    WHERE user_id = '4ba7d3dc-8bf4-4a88-9f98-c1df57e09020' 
      AND name = 'Kikoff Growth';
    
    -- Get the original table project data
    SELECT * INTO original_table_project
    FROM public.table_projects 
    WHERE user_id = 'b78278ca-b898-47d3-b5db-de1c6b21d13f'
      AND name = 'Kikoff App Landing Test 1 landing page';
    
    -- Generate new table project ID
    new_table_project_id := gen_random_uuid();
    
    -- Create the new table project with copied data
    INSERT INTO public.table_projects (
      id,
      name,
      description,
      user_id,
      database_id,
      schema,
      records,
      form_config,
      view_settings,
      analytics_config,
      gated_content_enabled,
      subscription_enabled,
      password_hash,
      created_at,
      updated_at
    ) VALUES (
      new_table_project_id,
      original_table_project.name,
      original_table_project.description,
      '4ba7d3dc-8bf4-4a88-9f98-c1df57e09020',
      new_database_id,
      original_table_project.schema,
      original_table_project.records,
      original_table_project.form_config,
      original_table_project.view_settings,
      original_table_project.analytics_config,
      original_table_project.gated_content_enabled,
      original_table_project.subscription_enabled,
      NULL, -- Don't copy password hash
      now(),
      now()
    );
    
    RAISE NOTICE 'Successfully copied Kikoff database and table project. New database ID: %, New table project ID: %', new_database_id, new_table_project_id;
END $$;