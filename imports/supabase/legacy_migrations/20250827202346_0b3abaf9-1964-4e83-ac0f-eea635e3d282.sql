-- Fix the options structure for select fields to match TableSchemaEditor expectations

UPDATE public.table_projects 
SET schema = jsonb_set(
  schema,
  '{fields}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN field->>'type' IN ('select') THEN
          jsonb_set(
            field,
            '{options}',
            jsonb_build_object(
              'values', 
              COALESCE(
                (
                  SELECT jsonb_agg(option->>'value')
                  FROM jsonb_array_elements(field->'options') AS option
                  WHERE option->>'value' IS NOT NULL
                ),
                '[]'::jsonb
              )
            )
          )
        ELSE field
      END
    )
    FROM jsonb_array_elements(schema->'fields') AS field
  )
)
WHERE user_id = '4ba7d3dc-8bf4-4a88-9f98-c1df57e09020' 
  AND name = 'Kikoff App Landing Test 1 landing page'
  AND schema->'fields' IS NOT NULL;