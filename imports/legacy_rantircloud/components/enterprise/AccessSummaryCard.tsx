import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Key, Building2 } from 'lucide-react';
import { enterpriseService } from '@/services/enterpriseService';
import type { WorkspaceMember, EnterpriseKey } from '@/types/enterprise';

interface AccessSummaryCardProps {
  workspaceId: string;
}

export function AccessSummaryCard({ workspaceId }: AccessSummaryCardProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [keys, setKeys] = useState<EnterpriseKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccessData();
  }, [workspaceId]);

  const loadAccessData = async () => {
    try {
      const [membersData, keysData] = await Promise.all([
        enterpriseService.getWorkspaceMembers(workspaceId),
        enterpriseService.getEnterpriseKeys(workspaceId)
      ]);
      
      setMembers(membersData);
      setKeys(keysData);
    } catch (error) {
      console.error('Error loading access data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading access summary...</p>
        </CardContent>
      </Card>
    );
  }

  const enterpriseMembers = members.filter(m => m.user_group === 'enterprise');
  const adminMembers = members.filter(m => m.role === 'admin' || m.role === 'owner');
  const activeKeys = keys.filter(k => k.status === 'active');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4" />
          Access Summary
        </CardTitle>
        <CardDescription>
          Overview of who has access to enterprise features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Enterprise Members */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Enterprise Members</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{enterpriseMembers.length}</span>
              <Badge variant="secondary" className="text-xs">
                of {members.length} total
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Members with enterprise access
            </p>
          </div>

          {/* Admin Access */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Admin Access</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{adminMembers.length}</span>
              <Badge variant="secondary" className="text-xs">
                admins
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Can manage enterprise settings
            </p>
          </div>

          {/* API Keys */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Active API Keys</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{activeKeys.length}</span>
              <Badge variant="secondary" className="text-xs">
                active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Keys with programmatic access
            </p>
          </div>
        </div>

        {/* Access Levels */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Access Levels</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Enterprise Dashboard</span>
              <Badge variant="outline">{enterpriseMembers.length} members</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>API Key Management</span>
              <Badge variant="outline">{adminMembers.length} admins</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Team Management</span>
              <Badge variant="outline">{adminMembers.length} admins</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Development Guide</span>
              <Badge variant="outline">{enterpriseMembers.length} members</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}