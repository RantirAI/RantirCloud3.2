-- Create public read-only views that can be accessed without authentication

-- Add RLS policy to allow public access to table_projects for read-only views
CREATE POLICY "Public read access for shared table projects" 
ON public.table_projects 
FOR SELECT 
USING (true);

-- Update read-only views to be truly public
ALTER TABLE public.table_projects ENABLE ROW LEVEL SECURITY;

-- Note: We're allowing public read access to all table projects here
-- In a production environment, you might want to add a "is_public" column
-- and only allow access to projects that are explicitly marked as public