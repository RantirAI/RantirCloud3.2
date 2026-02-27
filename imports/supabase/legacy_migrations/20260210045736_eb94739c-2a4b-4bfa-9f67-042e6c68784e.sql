-- Remove the overly permissive public read policy on table_projects
-- The owner-scoped "Users can view their own table projects" policy already exists
DROP POLICY IF EXISTS "Public read access for shared table projects" ON public.table_projects;