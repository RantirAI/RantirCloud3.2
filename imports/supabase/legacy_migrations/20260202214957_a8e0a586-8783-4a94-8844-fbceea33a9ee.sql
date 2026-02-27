-- First, delete orphaned published_apps that reference non-existent app_projects
DELETE FROM published_apps 
WHERE app_project_id NOT IN (SELECT id FROM app_projects);

-- Now add the foreign key constraint
ALTER TABLE published_apps 
ADD CONSTRAINT published_apps_app_project_id_fkey 
FOREIGN KEY (app_project_id) 
REFERENCES app_projects(id) 
ON DELETE CASCADE;