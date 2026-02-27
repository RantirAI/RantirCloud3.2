import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnterpriseBadge } from '@/components/EnterpriseBadge';
import { Users, Plus, MoreHorizontal, Mail, UserMinus } from 'lucide-react';
import { enterpriseService } from '@/services/enterpriseService';
import { useToast } from '@/hooks/use-toast';
import type { WorkspaceMember } from '@/types/enterprise';

interface TeamMembersCardProps {
  workspaceId: string;
}

export function TeamMembersCard({ workspaceId }: TeamMembersCardProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMembers();
  }, [workspaceId]);

  const loadMembers = async () => {
    try {
      const data = await enterpriseService.getWorkspaceMembers(workspaceId);
      setMembers(data);
    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: "Error",
        description: "Failed to load team members.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    
    if (!workspaceId) {
      toast({
        title: "Error",
        description: "No workspace selected",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setInviting(true);
      console.log('Inviting user:', { workspaceId, inviteEmail, inviteRole });
      const result = await enterpriseService.inviteEnterpriseUser(workspaceId, inviteEmail, inviteRole);
      console.log('Invitation result:', result);
      
      toast({
        title: "✓ Invitation Sent",
        description: `Invitation email sent to ${inviteEmail}`,
      });
      
      setInviteEmail('');
      setIsInviteOpen(false);
      await loadMembers();
    } catch (error: any) {
      console.error('Invitation error:', error);
      toast({
        title: "Invitation Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await enterpriseService.removeMember(workspaceId, userId);
      toast({
        title: "Member Removed",
        description: "Team member has been removed.",
      });
      await loadMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading team members...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-tiempos font-light text-foreground mb-2">Team Members</h2>
          <p className="text-muted-foreground">
            Manage your enterprise team members
          </p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Invite a new member to your enterprise workspace
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleInvite} 
                disabled={inviting || !inviteEmail.trim()}
                className="w-full"
              >
                {inviting ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-2.5 border rounded-lg">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {member.profiles?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{member.profiles?.name || 'Unknown User'}</p>
                      {member.user_group === 'enterprise' && <EnterpriseBadge showIcon={false} />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {member.role} • Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                    {member.role}
                  </Badge>
                  {member.role !== 'owner' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="h-8 w-8 p-0"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {members.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No team members found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}