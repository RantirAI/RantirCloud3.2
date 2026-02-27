-- ============================================
-- FIX ALL FOREIGN KEY CONSTRAINTS TO ALLOW USER DELETION
-- ============================================

-- 1. enterprise_keys.created_by (nullable) → SET NULL
ALTER TABLE public.enterprise_keys 
DROP CONSTRAINT IF EXISTS enterprise_keys_created_by_fkey;
ALTER TABLE public.enterprise_keys 
ADD CONSTRAINT enterprise_keys_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. workspace_members.invited_by (nullable) → SET NULL
ALTER TABLE public.workspace_members 
DROP CONSTRAINT IF EXISTS workspace_members_invited_by_fkey;
ALTER TABLE public.workspace_members 
ADD CONSTRAINT workspace_members_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. drive_folders.created_by (nullable) → SET NULL
ALTER TABLE public.drive_folders 
DROP CONSTRAINT IF EXISTS drive_folders_created_by_fkey;
ALTER TABLE public.drive_folders 
ADD CONSTRAINT drive_folders_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. drive_files.uploaded_by (nullable) → SET NULL
ALTER TABLE public.drive_files 
DROP CONSTRAINT IF EXISTS drive_files_uploaded_by_fkey;
ALTER TABLE public.drive_files 
ADD CONSTRAINT drive_files_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. flow_data.created_by (nullable) → SET NULL
ALTER TABLE public.flow_data 
DROP CONSTRAINT IF EXISTS flow_data_created_by_fkey;
ALTER TABLE public.flow_data 
ADD CONSTRAINT flow_data_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. flow_executions.created_by (nullable) → SET NULL
ALTER TABLE public.flow_executions 
DROP CONSTRAINT IF EXISTS flow_executions_created_by_fkey;
ALTER TABLE public.flow_executions 
ADD CONSTRAINT flow_executions_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. flow_node_configurations.created_by (nullable) → SET NULL
ALTER TABLE public.flow_node_configurations 
DROP CONSTRAINT IF EXISTS flow_node_configurations_created_by_fkey;
ALTER TABLE public.flow_node_configurations 
ADD CONSTRAINT flow_node_configurations_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. node_implementation_status.implemented_by (nullable) → SET NULL
ALTER TABLE public.node_implementation_status 
DROP CONSTRAINT IF EXISTS node_implementation_status_implemented_by_fkey;
ALTER TABLE public.node_implementation_status 
ADD CONSTRAINT node_implementation_status_implemented_by_fkey 
FOREIGN KEY (implemented_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 9. databases.user_id (NOT NULL - ownership) → CASCADE
ALTER TABLE public.databases 
DROP CONSTRAINT IF EXISTS databases_user_id_fkey;
ALTER TABLE public.databases 
ADD CONSTRAINT databases_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 10. table_projects.user_id (NOT NULL - ownership) → CASCADE
ALTER TABLE public.table_projects 
DROP CONSTRAINT IF EXISTS table_projects_user_id_fkey;
ALTER TABLE public.table_projects 
ADD CONSTRAINT table_projects_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 11. flow_projects.user_id (NOT NULL - ownership) → CASCADE
ALTER TABLE public.flow_projects 
DROP CONSTRAINT IF EXISTS flow_projects_user_id_fkey;
ALTER TABLE public.flow_projects 
ADD CONSTRAINT flow_projects_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;