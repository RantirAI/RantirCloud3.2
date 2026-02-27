-- Drop the existing constraint
ALTER TABLE public.enterprise_audit 
DROP CONSTRAINT enterprise_audit_actor_id_fkey;

-- Add it back with ON DELETE SET NULL
ALTER TABLE public.enterprise_audit 
ADD CONSTRAINT enterprise_audit_actor_id_fkey 
FOREIGN KEY (actor_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;