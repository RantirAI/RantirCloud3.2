-- Update is_workspace_member function to also include workspace owners
CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = target_workspace_id
    AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM workspaces
    WHERE id = target_workspace_id
    AND user_id = auth.uid()
  );
END;
$$;