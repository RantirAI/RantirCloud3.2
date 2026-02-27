-- Drop cloud_terminals first (has foreign key to cloud_projects)
DROP TABLE IF EXISTS public.cloud_terminals CASCADE;

-- Drop cloud_projects table
DROP TABLE IF EXISTS public.cloud_projects CASCADE;