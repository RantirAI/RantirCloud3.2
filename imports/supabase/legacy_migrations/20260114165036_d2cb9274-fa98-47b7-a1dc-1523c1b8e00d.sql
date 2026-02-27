-- ============================================
-- FULL CASCADE DELETE FOR LEGAL COMPLIANCE
-- Delete ALL user data when user is deleted
-- ============================================

-- 1. drive_files.uploaded_by → CASCADE (delete files)
ALTER TABLE public.drive_files 
DROP CONSTRAINT IF EXISTS drive_files_uploaded_by_fkey;
ALTER TABLE public.drive_files 
ADD CONSTRAINT drive_files_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. drive_folders.created_by → CASCADE (delete folders)
ALTER TABLE public.drive_folders 
DROP CONSTRAINT IF EXISTS drive_folders_created_by_fkey;
ALTER TABLE public.drive_folders 
ADD CONSTRAINT drive_folders_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. enterprise_audit.actor_id → CASCADE (delete audit logs)
ALTER TABLE public.enterprise_audit 
DROP CONSTRAINT IF EXISTS enterprise_audit_actor_id_fkey;
ALTER TABLE public.enterprise_audit 
ADD CONSTRAINT enterprise_audit_actor_id_fkey 
FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. enterprise_keys.created_by → CASCADE (delete API keys)
ALTER TABLE public.enterprise_keys 
DROP CONSTRAINT IF EXISTS enterprise_keys_created_by_fkey;
ALTER TABLE public.enterprise_keys 
ADD CONSTRAINT enterprise_keys_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. flow_data.created_by → CASCADE (delete flow data)
ALTER TABLE public.flow_data 
DROP CONSTRAINT IF EXISTS flow_data_created_by_fkey;
ALTER TABLE public.flow_data 
ADD CONSTRAINT flow_data_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. flow_executions.created_by → CASCADE (delete execution logs)
ALTER TABLE public.flow_executions 
DROP CONSTRAINT IF EXISTS flow_executions_created_by_fkey;
ALTER TABLE public.flow_executions 
ADD CONSTRAINT flow_executions_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. flow_node_configurations.created_by → CASCADE (delete configs)
ALTER TABLE public.flow_node_configurations 
DROP CONSTRAINT IF EXISTS flow_node_configurations_created_by_fkey;
ALTER TABLE public.flow_node_configurations 
ADD CONSTRAINT flow_node_configurations_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 8. node_implementation_status.implemented_by → CASCADE
ALTER TABLE public.node_implementation_status 
DROP CONSTRAINT IF EXISTS node_implementation_status_implemented_by_fkey;
ALTER TABLE public.node_implementation_status 
ADD CONSTRAINT node_implementation_status_implemented_by_fkey 
FOREIGN KEY (implemented_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 9. workspace_invitations.invited_by → CASCADE (delete invites)
ALTER TABLE public.workspace_invitations 
DROP CONSTRAINT IF EXISTS workspace_invitations_invited_by_fkey;
ALTER TABLE public.workspace_invitations 
ADD CONSTRAINT workspace_invitations_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Note: workspace_members.invited_by stays SET NULL
-- (Don't delete members just because their inviter was deleted)