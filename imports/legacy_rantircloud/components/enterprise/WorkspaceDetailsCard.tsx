import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, User, Hash } from 'lucide-react';
import { EnterpriseBadge } from '@/components/EnterpriseBadge';

interface WorkspaceDetailsCardProps {
  workspace: any;
}

export function WorkspaceDetailsCard({ workspace }: WorkspaceDetailsCardProps) {
  if (!workspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Workspace Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading workspace details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* Main Content */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">{workspace.name}</h3>
              {workspace.description && (
                <p className="text-xs text-muted-foreground">{workspace.description}</p>
              )}
            </div>
            <EnterpriseBadge />
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Workspace ID</p>
                <p className="text-xs font-mono">{workspace.id.slice(0, 8)}...</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-xs">
                  {new Date(workspace.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Owner</p>
              <p className="text-xs">You (Workspace Owner)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}