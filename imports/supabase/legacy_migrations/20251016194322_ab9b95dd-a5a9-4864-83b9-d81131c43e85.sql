-- Create workspace invitations table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- Enable RLS
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for workspace invitations
CREATE POLICY "Enterprise admins can manage invitations"
  ON public.workspace_invitations
  FOR ALL
  USING (is_enterprise_admin(workspace_id));

CREATE POLICY "Users can view their own invitations"
  ON public.workspace_invitations
  FOR SELECT
  USING (auth.email() = email);

-- Function to accept workspace invitation
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(invitation_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Trigger to update timestamp
CREATE TRIGGER update_workspace_invitations_timestamp
  BEFORE UPDATE ON public.workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();