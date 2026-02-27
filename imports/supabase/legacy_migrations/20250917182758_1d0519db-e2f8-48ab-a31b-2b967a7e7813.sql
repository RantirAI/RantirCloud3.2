-- Drop the existing foreign key constraint
ALTER TABLE public.table_projects 
DROP CONSTRAINT IF EXISTS table_projects_database_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE public.table_projects 
ADD CONSTRAINT table_projects_database_id_fkey 
FOREIGN KEY (database_id) 
REFERENCES public.databases(id) 
ON DELETE CASCADE;