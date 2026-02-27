-- Step 1: Add usage limit columns to billing_plans
ALTER TABLE billing_plans 
ADD COLUMN IF NOT EXISTS storage_limit_gb INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS max_databases INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_flows INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_apps INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_records_per_db INTEGER DEFAULT 1000000,
ADD COLUMN IF NOT EXISTS max_api_calls_monthly INTEGER DEFAULT 10000;

-- Update existing plans with proper limits based on their tier
-- Free/Basic tier
UPDATE billing_plans 
SET 
  storage_limit_gb = 6,
  max_databases = 10,
  max_flows = 10,
  max_apps = 5,
  max_records_per_db = 1000000,
  max_api_calls_monthly = 10000
WHERE code IN ('free', 'basic');

-- Professional tier
UPDATE billing_plans 
SET 
  storage_limit_gb = 50,
  max_databases = 25,
  max_flows = 50,
  max_apps = 20,
  max_records_per_db = 10000000,
  max_api_calls_monthly = 100000
WHERE code = 'professional';

-- Enterprise tiers
UPDATE billing_plans 
SET 
  storage_limit_gb = 100,
  max_databases = 100,
  max_flows = 100,
  max_apps = 50,
  max_records_per_db = 50000000,
  max_api_calls_monthly = 1000000
WHERE code LIKE 'enterprise_%';

-- Step 2: Create storage usage tracking function
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(user_uuid UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  total_bytes BIGINT := 0;
BEGIN
  -- Sum up all file sizes from storage.objects for this user
  SELECT COALESCE(SUM(
    CASE 
      WHEN metadata->>'size' IS NOT NULL 
      THEN (metadata->>'size')::BIGINT 
      ELSE 0 
    END
  ), 0)
  INTO total_bytes
  FROM storage.objects
  WHERE owner = user_uuid;
  
  -- Convert bytes to GB (rounded to 2 decimals)
  RETURN ROUND((total_bytes::NUMERIC / 1073741824), 2);
END;
$$;

-- Step 3: Create project count functions
CREATE OR REPLACE FUNCTION public.get_user_database_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM databases
  WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_user_flow_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM flow_projects
  WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_user_app_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM app_projects
  WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_user_total_projects(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    (SELECT COUNT(*) FROM databases WHERE user_id = user_uuid) +
    (SELECT COUNT(*) FROM flow_projects WHERE user_id = user_uuid) +
    (SELECT COUNT(*) FROM app_projects WHERE user_id = user_uuid)
  )::INTEGER;
$$;

-- Step 4: Create enterprise workspace usage functions
CREATE OR REPLACE FUNCTION public.get_workspace_storage_usage(workspace_uuid UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_gb NUMERIC := 0;
  member_id UUID;
BEGIN
  FOR member_id IN 
    SELECT user_id FROM workspace_members WHERE workspace_id = workspace_uuid
  LOOP
    total_gb := total_gb + get_user_storage_usage(member_id);
  END LOOP;
  
  RETURN total_gb;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_project_count(workspace_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count INTEGER := 0;
  member_id UUID;
BEGIN
  FOR member_id IN 
    SELECT user_id FROM workspace_members WHERE workspace_id = workspace_uuid
  LOOP
    total_count := total_count + get_user_total_projects(member_id);
  END LOOP;
  
  RETURN total_count;
END;
$$;