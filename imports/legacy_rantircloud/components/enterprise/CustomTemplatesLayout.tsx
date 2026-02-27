import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Zap } from 'lucide-react';

interface CustomTemplatesLayoutProps {
  workspaceId: string;
}

export function CustomTemplatesLayout({ workspaceId }: CustomTemplatesLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Header with Tiempos font */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-tiempos font-light text-foreground mb-2">Custom Templates</h2>
          <p className="text-muted-foreground">
            Upload and manage TypeScript template packages for your enterprise workspace
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Enterprise Feature
        </Badge>
      </div>

      {/* Content will be imported from CustomTemplatesCard */}
    </div>
  );
}