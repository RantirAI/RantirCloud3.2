import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Loader2, Mail, UserPlus, UserMinus, Clock, CheckCircle, XCircle, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    name: string | null;
  } | null;
}

interface WorkspaceInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  token: string;
}

interface WorkspaceMembersSectionProps {
  workspaceId: string;
  isOwner: boolean;
  currentUserId: string;
}

export function WorkspaceMembersSection({ workspaceId, isOwner, currentUserId }: WorkspaceMembersSectionProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadMembersAndInvitations();
  }, [workspaceId]);

  const loadMembersAndInvitations = async () => {
    setLoading(true);
    try {
      // Load workspace members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;

      // Fetch profiles for all members
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);

        const membersWithProfiles = membersData.map(member => ({
          ...member,
          profile: profiles?.find(p => p.id === member.user_id) || null
        }));
        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }

      // Load pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('status', ['pending']);

      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);
    } catch (error: any) {
      console.error('Error loading members:', error);
      toast.error('Failed to load workspace members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-workspace-invitation', {
        body: { workspaceId, email: inviteEmail.trim().toLowerCase(), role: inviteRole }
      });

      // Handle edge function errors
      if (error) {
        // Extract error message - could be in different places depending on error type
        let errorMsg = 'Failed to send invitation';
        
        // Check if it's a FunctionsHttpError with context
        if (error.context) {
          try {
            const contextData = await error.context.json();
            errorMsg = contextData?.error || errorMsg;
          } catch {
            // Context might not be JSON
          }
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        if (errorMsg.includes('already exists')) {
          toast.error('An invitation for this email already exists. Check the pending invitations below.');
        } else {
          toast.error(errorMsg);
        }
        return;
      }
      
      // Check for error in response data (backup check)
      if (data?.error) {
        if (data.error.includes('already exists')) {
          toast.error('An invitation for this email already exists. Check the pending invitations below.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.success('Invitation sent successfully!');

      setInviteEmail('');
      setInviteRole('member');
      loadMembersAndInvitations();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      const errorMessage = error?.message || 'Failed to send invitation';
      if (errorMessage.includes('already exists')) {
        toast.error('An invitation for this email already exists. Check the pending invitations below.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === currentUserId) {
      toast.error('You cannot remove yourself from the workspace');
      return;
    }

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Member removed from workspace');
      loadMembersAndInvitations();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
      toast.success('Invitation cancelled');
      loadMembersAndInvitations();
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invite New Member */}
      {isOwner && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Members
          </Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              className="flex-1"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleInvite} 
              disabled={inviting || !inviteEmail.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            An email will be sent with an invitation link to join your workspace
          </p>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Pending Invitations ({invitations.length})
            </Label>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {invitation.role}
                    </Badge>
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        title="Cancel invitation"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Current Members */}
      {members.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              Members ({members.length})
            </Label>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.profile?.name || member.user_id}`} 
                      />
                      <AvatarFallback>
                        {member.profile?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.profile?.name || 'Unknown User'}
                        {member.user_id === currentUserId && (
                          <span className="text-xs text-muted-foreground ml-2">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'owner' ? 'default' : 'outline'} className="text-xs">
                      {member.role}
                    </Badge>
                    {isOwner && member.user_id !== currentUserId && member.role !== 'owner' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(member.user_id)}
                        title="Remove member"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {members.length === 0 && invitations.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No members or pending invitations
        </p>
      )}
    </div>
  );
}
