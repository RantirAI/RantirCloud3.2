-- Phase 1: Add style_classes JSONB column to app_projects table
ALTER TABLE public.app_projects 
ADD COLUMN IF NOT EXISTS style_classes JSONB DEFAULT '{
  "version": 1,
  "classes": [],
  "styleHashRegistry": {},
  "namingConfig": {"counters": {}}
}'::jsonb;

-- Migrate existing style_classes table data into the new JSONB column
WITH aggregated_classes AS (
  SELECT 
    app_project_id,
    jsonb_build_object(
      'version', 1,
      'classes', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', id::text,
            'name', name,
            'styles', COALESCE(styles, '{}'::jsonb),
            'stateStyles', COALESCE(styles->'stateStyles', '{}'::jsonb),
            'appliedTo', COALESCE(applied_to, '[]'::jsonb),
            'inheritsFrom', COALESCE(styles->'inheritsFrom', '[]'::jsonb),
            'isAutoClass', COALESCE((styles->>'isAutoClass')::boolean, false),
            'dependentClasses', COALESCE(styles->'dependentClasses', '[]'::jsonb),
            'createdAt', created_at,
            'updatedAt', updated_at
          )
        ),
        '[]'::jsonb
      ),
      'styleHashRegistry', '{}'::jsonb,
      'namingConfig', '{"counters": {}}'::jsonb
    ) as style_classes_json
  FROM public.style_classes
  GROUP BY app_project_id
)
UPDATE public.app_projects ap
SET style_classes = ac.style_classes_json
FROM aggregated_classes ac
WHERE ap.id = ac.app_project_id;

-- Add comment for documentation
COMMENT ON COLUMN public.app_projects.style_classes IS 'Consolidated style classes JSON containing all class definitions, state styles, and naming configuration for atomic saves';