-- Update accept_workspace_invitation to increment seats count
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(invitation_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record workspace_invitations%ROWTYPE;
  result json;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record
  FROM workspace_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Check if user email matches
  IF auth.email() != invitation_record.email THEN
    RAISE EXCEPTION 'This invitation is for a different email address';
  END IF;
  
  -- Add user to workspace
  INSERT INTO workspace_members (workspace_id, user_id, role, user_group, invited_by, invited_at, joined_at)
  VALUES (
    invitation_record.workspace_id,
    auth.uid(),
    invitation_record.role,
    'enterprise',
    invitation_record.invited_by,
    invitation_record.created_at,
    now()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      user_group = 'enterprise',
      joined_at = now();
  
  -- Increment seats count in workspace_plans
  UPDATE workspace_plans
  SET seats = seats + 1
  WHERE workspace_id = invitation_record.workspace_id
    AND NOT EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_id = invitation_record.workspace_id 
        AND user_id = auth.uid()
        AND joined_at < now() - interval '1 second'
    );
  
  -- Mark invitation as accepted
  UPDATE workspace_invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = invitation_record.id;
  
  -- Log the action
  INSERT INTO enterprise_audit (workspace_id, actor_id, action, details)
  VALUES (
    invitation_record.workspace_id,
    auth.uid(),
    'invitation_accepted',
    json_build_object('email', invitation_record.email, 'role', invitation_record.role)
  );
  
  result := json_build_object(
    'success', true,
    'workspace_id', invitation_record.workspace_id
  );
  
  RETURN result;
END;
$function$;

-- Fix the current seats count for workspace ff646726-60a8-4f45-92ec-1119e67e37a4
UPDATE workspace_plans
SET seats = (
  SELECT COUNT(*) 
  FROM workspace_members 
  WHERE workspace_id = 'ff646726-60a8-4f45-92ec-1119e67e37a4'
)
WHERE workspace_id = 'ff646726-60a8-4f45-92ec-1119e67e37a4';